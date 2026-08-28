import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  AGENT,
  call,
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

beforeAll(async () => {
  harness = await createHarness();
  app = harness.app;
  agent = await signIn(app, AGENT);
  owner = await signIn(app, OWNER);
});

afterAll(async () => {
  await harness.close();
});

type AskResponse = {
  answer: string;
  confidence: string;
  eventIds: string[];
  caveat: string | null;
  fallback: boolean;
  questionsUsed: number;
  questionsAllowed: number | null;
};

const ask = (question: string, cookie: string) =>
  call<AskResponse>(app, {
    method: "POST",
    url: `/api/properties/${SHOWCASE}/ask`,
    cookie,
    payload: { question },
  });

/**
 * The harness runs with no ANTHROPIC_API_KEY, so these exercise the fallback
 * path. That is the path that must not embarrass the demo if the network is
 * flaky on the day.
 */
describe("Ask This Home without a live model", () => {
  beforeAll(async () => {
    // Take the free-tier cap out of the picture; it has its own suite below.
    await call(app, {
      method: "POST",
      url: "/api/billing/upgrade",
      cookie: owner,
      payload: { plan: "homeowner_plus", cycle: "monthly" },
    });
  });

  it("answers from the local record index and says so", async () => {
    const { body } = await ask("Has the basement ever had water problems?", owner);
    expect(body.fallback).toBe(true);
    expect(body.caveat).toContain("local record index");
  });

  it("cites real events from this property", async () => {
    const { body } = await ask("Has the basement ever had water problems?", owner);
    expect(body.eventIds).toContain("EV-0010");
    for (const id of body.eventIds) {
      expect(id).toMatch(/^EV-/);
    }
  });

  it("finds the roof replacement", async () => {
    const { body } = await ask("When was the roof replaced?", owner);
    expect(body.eventIds).toContain("EV-0016");
    expect(body.answer).toContain("Roof replacement");
  });

  it("matches whole words, not fragments inside other words", async () => {
    // "roof" is a substring of "waterproofing", so a naive `includes` ranked
    // the basement repair above the actual roof replacement.
    const { body } = await ask("roof", owner);
    expect(body.eventIds).not.toContain("EV-0010");
    expect(body.eventIds).toContain("EV-0016");
  });

  it("never claims something did not happen when the record is silent", async () => {
    // The record says nothing about a dishwasher. The honest answer is that it
    // says nothing — never that the home does not have one.
    const { body } = await ask("Is there a dishwasher?", owner);
    expect(body.answer).toContain("does not contain");
    expect(body.answer).toContain("Absence of a record does not mean");
    expect(body.confidence).toBe("LOW");
    expect(body.eventIds).toEqual([]);
  });

  it("ignores words that appear in almost every event", async () => {
    // "property" is in most of the record's boilerplate; ranking on it buried
    // the answer under the 1994 assessor entry.
    const { body } = await ask("Has this property ever had a swimming pool?", owner);
    expect(body.eventIds).not.toContain("EV-0001");
  });

  it("rejects an empty question", async () => {
    const { status } = await ask("", owner);
    expect(status).toBe(400);
  });
});

describe("the free-tier question cap", () => {
  it("allows three questions then returns the paywall", async () => {
    for (let i = 1; i <= 3; i += 1) {
      const { status, body } = await ask("When was the roof replaced?", agent);
      expect(status).toBe(200);
      expect(body.questionsUsed).toBe(i);
      expect(body.questionsAllowed).toBe(3);
    }

    const blocked = await call<{
      error: { code: string; details: { key: string; cta: string } };
    }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/ask`,
      cookie: agent,
      payload: { question: "One more?" },
    });
    expect(blocked.status).toBe(402);
    expect(blocked.body.error.code).toBe("PAYMENT_REQUIRED");
    expect(blocked.body.error.details.key).toBe("ask");
  });

  it("lifts the cap on Agent Pro", async () => {
    await call(app, {
      method: "POST",
      url: "/api/billing/upgrade",
      cookie: agent,
      payload: { plan: "agent_pro", cycle: "monthly" },
    });

    const { status, body } = await ask("When was the roof replaced?", agent);
    expect(status).toBe(200);
    expect(body.questionsAllowed).toBeNull();
  });
});

describe("document extraction", () => {
  it("stores the document and hashes it even when extraction is unavailable", async () => {
    const { status, body } = await call<{
      documentId: string;
      documentName: string;
      sha256: string;
      preview: string;
      manual: boolean;
      proposal: { confidence: string; amount: number | null; evidence: string[] };
    }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/extractions`,
      cookie: agent,
      payload: { demoDocumentKey: "hvac" },
    });

    expect(status).toBe(200);
    expect(body.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(body.documentName).toBe("summit-mechanical-26-3390.txt");
    expect(body.preview).toContain("SUMMIT MECHANICAL");
  });

  it("proposes nothing it could not read, rather than guessing", async () => {
    const { body } = await call<{
      manual: boolean;
      proposal: {
        confidence: string;
        amount: number | null;
        occurredAt: string | null;
        contractor: string | null;
        evidence: string[];
      };
    }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/extractions`,
      cookie: agent,
      payload: { demoDocumentKey: "sewer" },
    });

    expect(body.manual).toBe(true);
    expect(body.proposal.confidence).toBe("LOW");
    expect(body.proposal.amount).toBeNull();
    expect(body.proposal.occurredAt).toBeNull();
    expect(body.proposal.contractor).toBeNull();
    expect(body.proposal.evidence).toEqual([]);
  });

  it("rejects a request with neither a demo key nor text", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/extractions`,
      cookie: agent,
      payload: {},
    });
    expect(status).toBe(400);
  });

  it("accepts pasted document text", async () => {
    const { status, body } = await call<{ sha256: string; preview: string }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/extractions`,
      cookie: agent,
      payload: { fileName: "receipt.txt", text: "ACME GUTTERS\nTotal: $1,200.00" },
    });
    expect(status).toBe(200);
    expect(body.preview).toContain("ACME GUTTERS");
    expect(body.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("stewardship transfer", () => {
  it("retains the whole history and opens a new ownership period", async () => {
    const before = await call<{
      property: { events: unknown[]; ownership: { sequenceNumber: number }[] };
    }>(app, { url: `/api/properties/${SHOWCASE}`, cookie: agent });

    const { status, body } = await call<{
      result: {
        ownershipPeriodNumber: number;
        retainedEventCount: number;
        ledger: { valid: boolean };
      };
    }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/transfers`,
      cookie: agent,
      payload: {
        newOwnerName: "Dana Whitfield",
        newOwnerEmail: "owner@hometoken.demo",
        transferDate: "2026-08-28",
        acknowledged: true,
      },
    });

    expect(status).toBe(200);
    expect(body.result.ledger.valid).toBe(true);
    expect(body.result.ownershipPeriodNumber).toBe(4);
    // Two events appended: the transfer and the new ownership period.
    expect(body.result.retainedEventCount).toBe(
      before.body.property.events.length + 2,
    );
  });

  it("closes the previous ownership period without naming anyone", async () => {
    const { body } = await call<{
      property: {
        ownership: { sequenceNumber: number; isCurrent: boolean; range: string }[];
      };
    }>(app, { url: `/api/properties/${SHOWCASE}`, cookie: agent });

    const current = body.property.ownership.filter((o) => o.isCurrent);
    expect(current).toHaveLength(1);
    expect(current[0]!.sequenceNumber).toBe(4);

    const previous = body.property.ownership.find((o) => o.sequenceNumber === 3)!;
    expect(previous.isCurrent).toBe(false);
    expect(previous.range).not.toContain("present");
    expect(JSON.stringify(body.property.ownership)).not.toContain("Whitfield");
  });

  it("refuses without the simulated-transfer acknowledgement", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/transfers`,
      cookie: agent,
      payload: {
        newOwnerName: "A Person",
        newOwnerEmail: "a@example.com",
        transferDate: "2026-08-28",
        acknowledged: false,
      },
    });
    expect(status).toBe(400);
  });

  it("refuses an invalid email", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/transfers`,
      cookie: agent,
      payload: {
        newOwnerName: "A Person",
        newOwnerEmail: "not-an-email",
        transferDate: "2026-08-28",
        acknowledged: true,
      },
    });
    expect(status).toBe(400);
  });

  it("is closed to the homeowner", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/transfers`,
      cookie: owner,
      payload: {
        newOwnerName: "A Person",
        newOwnerEmail: "a@example.com",
        transferDate: "2026-08-28",
        acknowledged: true,
      },
    });
    expect(status).toBe(403);
  });
});

describe("plans and billing", () => {
  it("serves the four plan cards publicly, for the landing page", async () => {
    const { status, body } = await call<{
      plans: { id: string; primary: boolean }[];
      unitEconomicsTotal: string;
    }>(app, { url: "/api/plans" });

    expect(status).toBe(200);
    expect(body.plans.map((p) => p.id)).toEqual([
      "free",
      "homeowner_plus",
      "agent_pro",
      "verified_source",
    ]);
    expect(body.plans.find((p) => p.primary)?.id).toBe("agent_pro");
    expect(body.unitEconomicsTotal).toBe("$4.03M");
  });

  it("gates report export behind a paid plan", async () => {
    await call(app, {
      method: "POST",
      url: "/api/billing/upgrade",
      cookie: owner,
      payload: { plan: "free", cycle: "monthly" },
    });

    const { status, body } = await call<{ error: { details: { key: string } } }>(
      app,
      { url: `/api/properties/${SHOWCASE}/export`, cookie: owner },
    );
    expect(status).toBe(402);
    expect(body.error.details.key).toBe("export");
  });

  it("allows export once upgraded, with a ledger attestation", async () => {
    await call(app, {
      method: "POST",
      url: "/api/billing/upgrade",
      cookie: owner,
      payload: { plan: "homeowner_plus", cycle: "annual" },
    });

    const { status, body } = await call<{
      attestation: { ledgerValid: boolean; eventsChecked: number };
    }>(app, { url: `/api/properties/${SHOWCASE}/export`, cookie: owner });

    expect(status).toBe(200);
    expect(body.attestation.ledgerValid).toBe(true);
    expect(body.attestation.eventsChecked).toBeGreaterThan(0);
  });

  it("marks a cancelled subscription as ending, not ended", async () => {
    const { body } = await call<{
      subscription: { status: string; accessEndsOn: string | null };
    }>(app, { method: "POST", url: "/api/billing/cancel", cookie: owner });

    expect(body.subscription.status).toBe("CANCELS SOON");
    expect(body.subscription.accessEndsOn).toBeTruthy();
  });

  it("leaves the record intact after cancelling", async () => {
    // The record belongs to the property, not to the subscription that
    // happened to be paying when it was written.
    const { body } = await call<{
      property: { events: unknown[]; ledger: { valid: boolean } };
    }>(app, { url: `/api/properties/${SHOWCASE}`, cookie: owner });

    expect(body.property.events.length).toBeGreaterThan(20);
    expect(body.property.ledger.valid).toBe(true);
  });
});

describe("account settings", () => {
  it("changes a password when the current one is right", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/auth/password",
      cookie: owner,
      payload: {
        currentPassword: "demo-password",
        newPassword: "a-longer-password",
        confirmPassword: "a-longer-password",
      },
    });
    expect(status).toBe(200);

    const back = await call(app, {
      method: "POST",
      url: "/api/auth/password",
      cookie: owner,
      payload: {
        currentPassword: "a-longer-password",
        newPassword: "demo-password",
        confirmPassword: "demo-password",
      },
    });
    expect(back.status).toBe(200);
  });

  it("refuses a wrong current password", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/auth/password",
      cookie: owner,
      payload: {
        currentPassword: "not-it",
        newPassword: "a-longer-password",
        confirmPassword: "a-longer-password",
      },
    });
    expect(status).toBe(400);
  });

  it("enforces the 8-character minimum and the confirmation match", async () => {
    const short = await call(app, {
      method: "POST",
      url: "/api/auth/password",
      cookie: owner,
      payload: {
        currentPassword: "demo-password",
        newPassword: "short",
        confirmPassword: "short",
      },
    });
    expect(short.status).toBe(400);

    const mismatch = await call(app, {
      method: "POST",
      url: "/api/auth/password",
      cookie: owner,
      payload: {
        currentPassword: "demo-password",
        newPassword: "a-longer-password",
        confirmPassword: "a-different-one",
      },
    });
    expect(mismatch.status).toBe(400);
  });

  it("updates the profile", async () => {
    const { body } = await call<{ user: { phone: string | null } }>(app, {
      method: "PATCH",
      url: "/api/auth/profile",
      cookie: owner,
      payload: {
        name: "Dana Whitfield",
        email: "owner@hometoken.demo",
        phone: "(303) 555-9999",
      },
    });
    expect(body.user.phone).toBe("(303) 555-9999");
  });

  it("refuses an email already used by another account", async () => {
    const { status } = await call(app, {
      method: "PATCH",
      url: "/api/auth/profile",
      cookie: owner,
      payload: { name: "Dana Whitfield", email: AGENT, phone: null },
    });
    expect(status).toBe(400);
  });
});
