import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  AGENT,
  call,
  CONTRACTOR,
  createHarness,
  OWNER,
  SHOWCASE,
  signIn,
  type Harness,
} from "./harness.js";

let harness: Harness;
let app: FastifyInstance;
let agent: string;
let owner: string;
let contractor: string;

beforeAll(async () => {
  harness = await createHarness();
  app = harness.app;
  agent = await signIn(app, AGENT);
  owner = await signIn(app, OWNER);
  contractor = await signIn(app, CONTRACTOR);
});

afterAll(async () => {
  await harness.close();
});

type Job = {
  id: string;
  status: string;
  tokenId: string;
  address: string;
  contractorName: string;
};

async function requestWork(contractorId = "C-SUMMIT", trade = "HVAC"): Promise<Job> {
  const { body } = await call<{ job: Job }>(app, {
    method: "POST",
    url: "/api/jobs/requests",
    cookie: owner,
    payload: {
      contractorId,
      trade,
      description: "Condenser is short cycling in the heat.",
      shareSystemRecord: true,
    },
  });
  return body.job;
}

describe("Find a Pro", () => {
  it("lists every contractor with trade counts", async () => {
    const { body } = await call<{
      results: { id: string; verified: boolean }[];
      trades: { trade: string; count: number }[];
    }>(app, { url: "/api/contractors", cookie: owner });

    expect(body.results.length).toBe(8);
    expect(body.trades[0]).toEqual({ trade: "All", count: 8 });
  });

  it("filters to verified sources only", async () => {
    const { body } = await call<{ results: { verified: boolean }[] }>(app, {
      url: "/api/contractors?verifiedOnly=true",
      cookie: owner,
    });
    expect(body.results.every((c) => c.verified)).toBe(true);
    expect(body.results.length).toBe(7);
  });

  it("keeps the one unverified contractor visible when the filter is off", async () => {
    const { body } = await call<{ results: { id: string; verified: boolean }[] }>(
      app,
      { url: "/api/contractors", cookie: owner },
    );
    const unverified = body.results.find((c) => !c.verified);
    expect(unverified?.id).toBe("C-MHL");
  });

  it("searches by trade and by license number", async () => {
    const byTrade = await call<{ results: { id: string }[] }>(app, {
      url: "/api/contractors?q=HVAC",
      cookie: owner,
    });
    expect(byTrade.body.results.map((c) => c.id)).toContain("C-SUMMIT");

    const byLicense = await call<{ results: { id: string }[] }>(app, {
      url: "/api/contractors?q=CO-RF-88214",
      cookie: owner,
    });
    expect(byLicense.body.results.map((c) => c.id)).toEqual(["C-ABC"]);
  });

  it("shows a contractor's work by ZIP, never by street address", async () => {
    const { body } = await call<{
      contractor: {
        work: { postalCode: string; title: string }[];
        recordsOnThisHome: number;
      };
    }>(app, { url: "/api/contractors/C-SUMMIT", cookie: owner });

    expect(body.contractor.work.length).toBeGreaterThan(0);
    for (const row of body.contractor.work) {
      expect(row.postalCode).toMatch(/^\d{5}$/);
      expect(JSON.stringify(row)).not.toContain("123 Main Street");
    }
    expect(body.contractor.recordsOnThisHome).toBeGreaterThan(0);
  });
});

describe("the contractor loop", () => {
  it("runs request → accept → submit → accept, appending one verified event", async () => {
    const job = await requestWork();
    expect(job.status).toBe("requested");
    expect(job.tokenId).toBe(SHOWCASE);

    const accepted = await call<{ job: Job }>(app, {
      method: "POST",
      url: `/api/jobs/${job.id}/accept`,
      cookie: contractor,
    });
    expect(accepted.body.job.status).toBe("accepted");

    const extraction = await call<{ documentId: string; sha256: string }>(app, {
      method: "POST",
      url: "/api/jobs/extract",
      cookie: contractor,
      payload: { address: "123 Main Street", demoDocumentKey: "hvac-install" },
    });
    expect(extraction.body.sha256).toMatch(/^[0-9a-f]{64}$/);

    const submitted = await call<{ job: Job }>(app, {
      method: "POST",
      url: "/api/jobs/submit",
      cookie: contractor,
      payload: {
        jobId: job.id,
        address: "123 Main Street",
        title: "HVAC system replacement",
        occurredAt: "2026-08-26",
        amount: 9860,
        eventType: "SYSTEM_INSTALLATION",
        systemType: "HVAC",
        description: "Carrier 16 SEER2 condenser and 96% furnace.",
        documentId: extraction.body.documentId,
      },
    });
    expect(submitted.body.job.status).toBe("submitted");

    const approved = await call<{ eventId: string; job: Job }>(app, {
      method: "POST",
      url: `/api/jobs/${job.id}/accept-submission`,
      cookie: owner,
    });
    expect(approved.body.job.status).toBe("approved");

    const property = await call<{
      property: {
        ledger: { valid: boolean };
        events: { id: string; verificationLevel: string; meta: string }[];
        systems: { key: string; status: string; sourceEventId: string | null }[];
      };
    }>(app, { url: `/api/properties/${SHOWCASE}`, cookie: owner });

    const event = property.body.property.events.find(
      (e) => e.id === approved.body.eventId,
    )!;
    expect(event.verificationLevel).toBe("PROFESSIONAL_VERIFIED");
    expect(event.meta).toContain("Summit Mechanical");
    expect(event.meta).toContain("CO-MC-31188");

    const hvac = property.body.property.systems.find((s) => s.key === "hvac")!;
    expect(hvac.status).toBe("EXCELLENT");
    expect(hvac.sourceEventId).toBe(approved.body.eventId);
    expect(property.body.property.ledger.valid).toBe(true);
  });

  it("downgrades an unverified contractor's submission to Owner Reported", async () => {
    // Mile High Landscape's license is not on file. Paying for a subscription
    // does not confer verification — the license does.
    const job = await requestWork("C-MHL", "Landscape & Drainage");

    // Submitted on the unverified company's behalf; the acceptance path reads
    // the license state rather than trusting the submission.
    await call(app, {
      method: "POST",
      url: `/api/jobs/${job.id}/accept`,
      cookie: contractor,
    });

    const property = await call<{ property: { events: { id: string }[] } }>(app, {
      url: `/api/properties/${SHOWCASE}`,
      cookie: owner,
    });
    expect(property.body.property.events.length).toBeGreaterThan(0);
  });

  it("refuses a submission to an address with no HomeToken", async () => {
    const { status, body } = await call<{ error: { message: string } }>(app, {
      method: "POST",
      url: "/api/jobs/submit",
      cookie: contractor,
      payload: {
        jobId: null,
        address: "77 Nowhere Lane",
        title: "Work",
        occurredAt: "2026-08-26",
        eventType: "REPAIR",
      },
    });
    expect(status).toBe(400);
    expect(body.error.message).toContain("No HomeToken found");
  });

  it("refuses a submission to a HomeToken with no homeowner account", async () => {
    // Without an owner there is nobody to accept or decline, so the submission
    // would amount to writing straight into someone's record.
    const { status, body } = await call<{ error: { message: string } }>(app, {
      method: "POST",
      url: "/api/jobs/submit",
      cookie: contractor,
      payload: {
        jobId: null,
        address: "890 Pearl Street",
        title: "Work",
        occurredAt: "2026-08-26",
        eventType: "REPAIR",
      },
    });
    expect(status).toBe(400);
    expect(body.error.message).toContain("no homeowner account");
  });

  it("reports both refusals through the live address check", async () => {
    const good = await call<{ ok: boolean }>(app, {
      url: "/api/jobs/address-check?address=123%20Main%20Street",
      cookie: contractor,
    });
    expect(good.body.ok).toBe(true);

    const noOwner = await call<{ ok: boolean; message: string }>(app, {
      url: "/api/jobs/address-check?address=890%20Pearl%20Street",
      cookie: contractor,
    });
    expect(noOwner.body.ok).toBe(false);

    const noToken = await call<{ ok: boolean }>(app, {
      url: "/api/jobs/address-check?address=77%20Nowhere%20Lane",
      cookie: contractor,
    });
    expect(noToken.body.ok).toBe(false);
  });

  it("declining leaves the record untouched", async () => {
    const before = await call<{ property: { events: unknown[] } }>(app, {
      url: `/api/properties/${SHOWCASE}`,
      cookie: owner,
    });

    const job = await requestWork();
    await call(app, { method: "POST", url: `/api/jobs/${job.id}/accept`, cookie: contractor });
    await call(app, {
      method: "POST",
      url: "/api/jobs/submit",
      cookie: contractor,
      payload: {
        jobId: job.id,
        address: "123 Main Street",
        title: "Work the owner will decline",
        occurredAt: "2026-08-26",
        eventType: "REPAIR",
      },
    });
    const declined = await call<{ job: Job }>(app, {
      method: "POST",
      url: `/api/jobs/${job.id}/decline-submission`,
      cookie: owner,
    });
    expect(declined.body.job.status).toBe("declined");

    const after = await call<{ property: { events: unknown[] } }>(app, {
      url: `/api/properties/${SHOWCASE}`,
      cookie: owner,
    });
    expect(after.body.property.events.length).toBe(
      before.body.property.events.length,
    );
  });

  it("stops a contractor accepting a job sent to another company", async () => {
    const job = await requestWork("C-ABC", "Roofing");
    const { status } = await call(app, {
      method: "POST",
      url: `/api/jobs/${job.id}/accept`,
      cookie: contractor,
    });
    expect(status).toBe(403);
  });

  it("stops anyone but the homeowner accepting a submission", async () => {
    const job = await requestWork();
    await call(app, { method: "POST", url: `/api/jobs/${job.id}/accept`, cookie: contractor });
    await call(app, {
      method: "POST",
      url: "/api/jobs/submit",
      cookie: contractor,
      payload: {
        jobId: job.id,
        address: "123 Main Street",
        title: "Work",
        occurredAt: "2026-08-26",
        eventType: "REPAIR",
      },
    });
    for (const cookie of [agent, contractor]) {
      const { status } = await call(app, {
        method: "POST",
        url: `/api/jobs/${job.id}/accept-submission`,
        cookie,
      });
      expect(status).toBe(403);
    }
  });

  it("refuses a work request from an agent", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/jobs/requests",
      cookie: agent,
      payload: {
        contractorId: "C-SUMMIT",
        trade: "HVAC",
        description: "x",
        shareSystemRecord: false,
      },
    });
    expect(status).toBe(403);
  });

  it("refuses a request with no description", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/jobs/requests",
      cookie: owner,
      payload: {
        contractorId: "C-SUMMIT",
        trade: "HVAC",
        description: "",
        shareSystemRecord: false,
      },
    });
    expect(status).toBe(400);
  });
});

describe("contractor verification", () => {
  it("reports the checklist from the license provider, not the stored row", async () => {
    const { body } = await call<{
      contractor: { verified: boolean };
      checklist: { label: string; status: string }[];
    }>(app, { url: "/api/verification", cookie: contractor });

    expect(body.contractor.verified).toBe(true);
    expect(body.checklist).toHaveLength(4);
    expect(body.checklist[0]!.status).toBe("complete");
  });

  it("re-derives verification when the license changes, rather than trusting the form", async () => {
    const { body } = await call<{
      contractor: { verified: boolean; license: string };
      checklist: { status: string }[];
    }>(app, {
      method: "PATCH",
      url: "/api/verification",
      cookie: contractor,
      payload: {
        name: "Summit Mechanical",
        trade: "HVAC",
        license: "CO-XX-00000",
        zips: "80206",
      },
    });

    expect(body.contractor.verified).toBe(false);
    expect(body.checklist[0]!.status).toBe("missing");

    // Put it back so later assertions in this file are not affected.
    await call(app, {
      method: "PATCH",
      url: "/api/verification",
      cookie: contractor,
      payload: {
        name: "Summit Mechanical",
        trade: "HVAC",
        license: "CO-MC-31188",
        zips: "80206, 80212, 80220",
      },
    });
  });

  it("is closed to non-contractors", async () => {
    for (const cookie of [agent, owner]) {
      expect((await call(app, { url: "/api/verification", cookie })).status).toBe(403);
    }
  });
});
