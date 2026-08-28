import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  AGENT,
  call,
  createHarness,
  OWNER,
  SHOWCASE,
  signIn,
  UNCLAIMED,
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

type PropertyResponse = {
  property: {
    ledger: { valid: boolean; checkedEvents: number; genesisDate: string };
    health: { score: number; confidence: string };
    events: {
      id: string;
      title: string;
      verificationLevel: string;
      visibility: string;
      eventHash: string;
      previousHash: string | null;
      occurredAt: string;
    }[];
    systems: { key: string; status: string; sourceEventId: string | null }[];
    documents: { id: string; visibility: string; sha256: string }[];
  };
  contribute: { allowed: boolean; title: string | null; ctaAction: string | null };
  claimState: { key: string };
  seededStats: { events: number; documents: number };
};

const getProperty = async (tokenId: string, cookie: string | null) =>
  call<PropertyResponse>(app, { url: `/api/properties/${tokenId}`, cookie });

describe("the seeded showcase record", () => {
  it("loads with a valid ledger over 24 events", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    expect(body.property.ledger.valid).toBe(true);
    expect(body.property.ledger.checkedEvents).toBe(24);
    expect(body.property.ledger.genesisDate).toBe("1994-06-01");
  });

  it("scores 92 with High confidence", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    expect(body.property.health.score).toBe(92);
    expect(body.property.health.confidence).toBe("High");
  });

  it("has the HVAC system on WATCH, which is what the score reflects", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    const hvac = body.property.systems.find((s) => s.key === "hvac");
    expect(hvac?.status).toBe("WATCH");
    expect(hvac?.sourceEventId).toBe("EV-0022");
  });

  it("chains the first event from GENESIS and each one to the last", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    const oldestFirst = [...body.property.events].reverse();
    expect(oldestFirst[0]!.previousHash).toBe("GENESIS");
    for (let i = 1; i < oldestFirst.length; i += 1) {
      expect(oldestFirst[i]!.previousHash).toBe(oldestFirst[i - 1]!.eventHash);
    }
  });

  it("carries the water-intrusion history the basement question depends on", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    const ids = body.property.events.map((e) => e.id);
    expect(ids).toContain("EV-0010");
    expect(ids).toContain("EV-0011");
  });

  it("is searchable by address, token id and parcel id", async () => {
    for (const q of ["123 Main", "HT-US-CO-DEN-00001234", "DEN-1234-567-89", "Denver"]) {
      const { body } = await call<{ results: { tokenId: string }[] }>(app, {
        url: `/api/properties/search?q=${encodeURIComponent(q)}`,
        cookie: agent,
      });
      expect(body.results.map((r) => r.tokenId)).toContain(SHOWCASE);
    }
  });

  it("returns nothing for a query that matches no parcel", async () => {
    const { body } = await call<{ results: unknown[] }>(app, {
      url: "/api/properties/search?q=zzzznotarealstreet",
      cookie: agent,
    });
    expect(body.results).toEqual([]);
  });
});

describe("append-only writes", () => {
  it("appends an event and leaves the chain valid", async () => {
    const before = await getProperty(SHOWCASE, agent);
    const { status, body } = await call<{
      eventId: string;
      ledger: { valid: boolean; checkedEvents: number };
    }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/events`,
      cookie: agent,
      payload: {
        title: "Gutter replacement",
        eventType: "IMPROVEMENT",
        occurredAt: "2026-07-09",
        description: "Six inch seamless aluminium, full perimeter.",
        contractor: "Front Range Exteriors",
        amount: 2140,
        verificationLevel: "OWNER_REPORTED",
        visibility: "AUTHENTICATED",
      },
    });

    expect(status).toBe(200);
    expect(body.ledger.valid).toBe(true);
    expect(body.ledger.checkedEvents).toBe(
      before.body.property.ledger.checkedEvents + 1,
    );
  });

  it("keeps the chain valid when a backdated event sorts into history", async () => {
    // The hard case: an invoice from 2015 entered today re-sorts into the
    // middle of the chain and shifts every hash after it. Appending only to
    // the tail would leave the ledger silently wrong here.
    const { body } = await call<{ ledger: { valid: boolean } }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/events`,
      cookie: agent,
      payload: {
        title: "Historic fence repair",
        eventType: "REPAIR",
        occurredAt: "2015-04-02",
        description: "Backdated from a prior owner's receipt.",
        verificationLevel: "OWNER_REPORTED",
        visibility: "AUTHENTICATED",
      },
    });
    expect(body.ledger.valid).toBe(true);

    const after = await getProperty(SHOWCASE, agent);
    const oldestFirst = [...after.body.property.events].reverse();
    expect(oldestFirst[0]!.previousHash).toBe("GENESIS");
    for (let i = 1; i < oldestFirst.length; i += 1) {
      expect(oldestFirst[i]!.previousHash).toBe(oldestFirst[i - 1]!.eventHash);
    }
  });

  it("never removes or rewrites an existing event", async () => {
    const before = await getProperty(SHOWCASE, agent);
    const roof = before.body.property.events.find((e) => e.id === "EV-0016")!;

    await call(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/events`,
      cookie: agent,
      payload: {
        title: "Correction note",
        eventType: "NOTE",
        occurredAt: "2026-08-28",
        description: "Supersedes nothing; recorded for completeness.",
        verificationLevel: "OWNER_REPORTED",
        visibility: "AUTHENTICATED",
      },
    });

    const after = await getProperty(SHOWCASE, agent);
    const stillThere = after.body.property.events.find((e) => e.id === "EV-0016")!;
    expect(stillThere.title).toBe(roof.title);
    expect(stillThere.verificationLevel).toBe(roof.verificationLevel);
    // Content is unchanged; the hash may differ only because an earlier-dated
    // event was inserted before it, never because this event was edited.
    expect(after.body.property.events.length).toBeGreaterThan(
      before.body.property.events.length,
    );
  });

  it("refuses to record an approved event as pending AI extraction", async () => {
    const { status, body } = await call<{ error: { code: string } }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/events`,
      cookie: agent,
      payload: {
        title: "Should not land",
        eventType: "REPAIR",
        occurredAt: "2026-08-28",
        verificationLevel: "AI_EXTRACTED_PENDING",
        visibility: "AUTHENTICATED",
      },
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects an event with no title", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/events`,
      cookie: agent,
      payload: {
        title: "",
        eventType: "REPAIR",
        occurredAt: "2026-08-28",
        verificationLevel: "OWNER_REPORTED",
        visibility: "AUTHENTICATED",
      },
    });
    expect(status).toBe(400);
  });

  it("updates the matching system and the cached health score", async () => {
    const { body } = await call<{ eventId: string }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/events`,
      cookie: agent,
      payload: {
        title: "HVAC replacement",
        eventType: "SYSTEM_INSTALLATION",
        occurredAt: "2026-08-24",
        description: "Carrier 16 SEER2 condenser and 96% furnace.",
        contractor: "Summit Mechanical",
        amount: 9860,
        systemType: "HVAC",
        verificationLevel: "OWNER_REPORTED",
        visibility: "AUTHENTICATED",
      },
    });

    const after = await getProperty(SHOWCASE, agent);
    const hvac = after.body.property.systems.find((s) => s.key === "hvac")!;
    expect(hvac.status).toBe("EXCELLENT");
    expect(hvac.sourceEventId).toBe(body.eventId);
    // Clearing the only WATCH system takes the score from 92 to 100.
    expect(after.body.property.health.score).toBe(100);
  });
});

describe("document visibility", () => {
  it("serves a public document to an anonymous reader", async () => {
    const { body } = await getProperty(SHOWCASE, null);
    const publicDoc = body.property.documents.find((d) => d.visibility === "PUBLIC")!;
    const response = await call(app, {
      url: `/api/properties/${SHOWCASE}/documents/${publicDoc.id}`,
      cookie: null,
    });
    expect(response.status).toBe(200);
  });

  it("requires a session for an authenticated document", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    const doc = body.property.documents.find((d) => d.visibility === "AUTHENTICATED")!;
    expect((await call(app, { url: `/api/properties/${SHOWCASE}/documents/${doc.id}`, cookie: null })).status).toBe(403);
    expect((await call(app, { url: `/api/properties/${SHOWCASE}/documents/${doc.id}`, cookie: agent })).status).toBe(200);
  });

  it("refuses a restricted document even to the record's own steward", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    const doc = body.property.documents.find((d) => d.visibility === "RESTRICTED")!;
    for (const cookie of [null, agent, owner]) {
      const response = await call<{ error: { code: string } }>(app, {
        url: `/api/properties/${SHOWCASE}/documents/${doc.id}`,
        cookie,
      });
      expect(response.status).toBe(403);
    }
  });

  it("never inlines a document body in the property payload", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    expect(body.property.documents.every((d) => !("text" in d && d.text))).toBe(true);
  });

  it("records a real sha256 for every document", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    expect(body.property.documents.length).toBeGreaterThan(0);
    for (const doc of body.property.documents) {
      expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("refuses a document belonging to a different property", async () => {
    const { body } = await getProperty(SHOWCASE, agent);
    const doc = body.property.documents[0]!;
    const response = await call(app, {
      url: `/api/properties/${UNCLAIMED}/documents/${doc.id}`,
      cookie: agent,
    });
    expect(response.status).toBe(404);
  });
});
