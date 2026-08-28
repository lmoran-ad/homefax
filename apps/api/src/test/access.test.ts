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
  UNCLAIMED,
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

type Contribute = {
  contribute: { allowed: boolean; title: string | null; ctaAction: string | null };
  claimState: { key: string };
  claim: { status: string; daysUntilExpiry: number | null } | null;
};

const contributeFor = async (tokenId: string, cookie: string | null) =>
  (await call<Contribute>(app, { url: `/api/properties/${tokenId}`, cookie })).body;

describe("authentication", () => {
  it("rejects a wrong password", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/auth/login",
      payload: { email: AGENT, password: "wrong", keepSignedIn: true },
    });
    expect(status).toBe(401);
  });

  it("gives the same answer for an unknown account, revealing nothing", async () => {
    const unknown = await call<{ error: { message: string } }>(app, {
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "nobody@homefax.demo", password: "demo-password" },
    });
    const wrong = await call<{ error: { message: string } }>(app, {
      method: "POST",
      url: "/api/auth/login",
      payload: { email: AGENT, password: "wrong" },
    });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it("rejects an unauthenticated call to /auth/me", async () => {
    expect((await call(app, { url: "/api/auth/me" })).status).toBe(401);
  });

  it("does not send the demo password to the browser", async () => {
    const { body } = await call<unknown>(app, { url: "/api/auth/demo-accounts" });
    expect(JSON.stringify(body)).not.toContain("demo-password");
  });

  it("issues an httpOnly session cookie", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: AGENT, password: "demo-password" },
    });
    const cookie = String(response.headers["set-cookie"]);
    expect(cookie.toLowerCase()).toContain("httponly");
  });
});

describe("contributeState is the single authority", () => {
  it("allows the agent on a record they steward", async () => {
    const body = await contributeFor(SHOWCASE, agent);
    expect(body.contribute.allowed).toBe(true);
    expect(body.claimState.key).toBe("active");
  });

  it("blocks the agent on an unclaimed record and offers the claim", async () => {
    const body = await contributeFor(UNCLAIMED, agent);
    expect(body.contribute.allowed).toBe(false);
    expect(body.contribute.ctaAction).toBe("claim");
    expect(body.claimState.key).toBe("unclaimed");
  });

  it("allows the homeowner on their verified home", async () => {
    expect((await contributeFor(SHOWCASE, owner)).contribute.allowed).toBe(true);
  });

  it("blocks the homeowner on a home that is not theirs", async () => {
    const body = await contributeFor(UNCLAIMED, owner);
    expect(body.contribute.allowed).toBe(false);
    expect(body.contribute.ctaAction).toBe("ownerClaim");
  });

  it("never lets a contractor write from a property record", async () => {
    // Contractors submit from Jobs, where the homeowner accepts or declines.
    // Writing directly would turn a proposal into an edit.
    for (const tokenId of [SHOWCASE, UNCLAIMED]) {
      const body = await contributeFor(tokenId, contractor);
      expect(body.contribute.allowed).toBe(false);
      expect(body.contribute.ctaAction).toBe("jobs");
    }
  });

  it("blocks an anonymous reader from contributing but not from reading", async () => {
    const body = await contributeFor(SHOWCASE, null);
    expect(body.contribute.allowed).toBe(false);
  });
});

describe("gated actions are enforced server-side", () => {
  const gated = (tokenId: string) => [
    {
      name: "append",
      method: "POST" as const,
      url: `/api/properties/${tokenId}/events`,
      payload: {
        title: "x",
        eventType: "REPAIR",
        occurredAt: "2026-08-28",
        verificationLevel: "OWNER_REPORTED",
        visibility: "AUTHENTICATED",
      },
    },
    {
      name: "extract",
      method: "POST" as const,
      url: `/api/properties/${tokenId}/extractions`,
      payload: { demoDocumentKey: "hvac" },
    },
    {
      name: "ask",
      method: "POST" as const,
      url: `/api/properties/${tokenId}/ask`,
      payload: { question: "When was the roof replaced?" },
    },
    {
      name: "transfer",
      method: "POST" as const,
      url: `/api/properties/${tokenId}/transfers`,
      payload: {
        newOwnerName: "A Person",
        newOwnerEmail: "a@example.com",
        transferDate: "2026-08-28",
        acknowledged: true,
      },
    },
    { name: "export", method: "GET" as const, url: `/api/properties/${tokenId}/export` },
  ];

  it("refuses every write path on an unclaimed record", async () => {
    for (const route of gated(UNCLAIMED)) {
      const { status } = await call(app, { ...route, cookie: agent });
      expect(status, `${route.name} should be forbidden`).toBe(403);
    }
  });

  it("refuses every write path to an anonymous caller", async () => {
    for (const route of gated(SHOWCASE)) {
      const { status } = await call(app, { ...route, cookie: null });
      expect(status, `${route.name} should be unauthorized`).toBe(401);
    }
  });

  it("leaves the record readable while it is locked", async () => {
    const { status, body } = await call<{ property: { events: unknown[] } }>(app, {
      url: `/api/properties/${UNCLAIMED}`,
      cookie: agent,
    });
    expect(status).toBe(200);
    expect(body.property.events.length).toBeGreaterThan(0);
  });
});

describe("agent stewardship claims", () => {
  it("rejects an MLS number that is not the listing of record, and names the real one", async () => {
    const { status, body } = await call<{ error: { code: string; message: string } }>(
      app,
      {
        method: "POST",
        url: `/api/properties/${UNCLAIMED}/claim`,
        cookie: agent,
        payload: { method: "mls", mlsNumber: "0000000" },
      },
    );
    expect(status).toBe(422);
    expect(body.error.code).toBe("CLAIM_REJECTED");
    expect(body.error.message).toContain("9184021");
  });

  it("grants immediately on the matching MLS number, with a 90-day expiry", async () => {
    const { body } = await call<{
      result: { status: string; expiresAt: string };
    }>(app, {
      method: "POST",
      url: `/api/properties/${UNCLAIMED}/claim`,
      cookie: agent,
      payload: { method: "mls", mlsNumber: "9184021" },
    });
    expect(body.result.status).toBe("active");
    expect(body.result.expiresAt).toBe("2026-11-26");

    const after = await contributeFor(UNCLAIMED, agent);
    expect(after.contribute.allowed).toBe(true);
    expect(after.claim?.daysUntilExpiry).toBe(90);
  });

  it("lands seller authorization pending, without granting access", async () => {
    const token = "HF-US-CO-DEN-00003042";
    const { body } = await call<{ result: { status: string } }>(app, {
      method: "POST",
      url: `/api/properties/${token}/claim`,
      cookie: agent,
      payload: { method: "seller", acknowledged: true },
    });
    expect(body.result.status).toBe("pending");

    const after = await contributeFor(token, agent);
    expect(after.contribute.allowed).toBe(false);
    expect(after.contribute.ctaAction).toBe("claimStatus");
  });

  it("refuses seller authorization without the acknowledgement", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/properties/HF-US-CO-DEN-00002914/claim",
      cookie: agent,
      payload: { method: "seller", acknowledged: false },
    });
    expect(status).toBe(400);
  });

  it("grants title and escrow for 30 days, not 90", async () => {
    const { body } = await call<{ result: { status: string; expiresAt: string } }>(
      app,
      {
        method: "POST",
        url: "/api/properties/HF-US-CO-DEN-00005120/claim",
        cookie: agent,
        payload: { method: "title", escrowNumber: "ESC-2026-4471" },
      },
    );
    expect(body.result.status).toBe("active");
    expect(body.result.expiresAt).toBe("2026-09-27");
  });

  it("refuses title and escrow with no escrow number", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/properties/HF-US-CO-DEN-00005388/claim",
      cookie: agent,
      payload: { method: "title", escrowNumber: "" },
    });
    expect(status).toBe(400);
  });

  it("refuses a claim from a homeowner", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/properties/HF-US-CO-LTN-00000912/claim",
      cookie: owner,
      payload: { method: "mls", mlsNumber: "9180533" },
    });
    expect(status).toBe(403);
  });

  it("releasing stewardship revokes access without touching the record", async () => {
    const before = await call<{ property: { events: unknown[] } }>(app, {
      url: `/api/properties/${UNCLAIMED}`,
      cookie: agent,
    });

    await call(app, {
      method: "POST",
      url: `/api/properties/${UNCLAIMED}/release`,
      cookie: agent,
    });

    const after = await call<Contribute & { property: { events: unknown[] } }>(app, {
      url: `/api/properties/${UNCLAIMED}`,
      cookie: agent,
    });
    expect(after.body.contribute.allowed).toBe(false);
    expect(after.body.property.events.length).toBe(
      before.body.property.events.length,
    );
  });
});

describe("homeowner ownership verification", () => {
  it("verifies against the county deed when the name matches", async () => {
    // Re-verifying the home Dana already owns exercises the matching branch.
    const { body } = await call<{ result: { status: string } }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/verify-ownership`,
      cookie: owner,
      payload: { method: "record" },
    });
    expect(body.result.status).toBe("active");
  });

  it("refuses a deed match on a parcel they do not own, and points at the proof path", async () => {
    const { status, body } = await call<{ error: { code: string; message: string } }>(
      app,
      {
        method: "POST",
        url: "/api/properties/HF-US-CO-DEN-00004501/verify-ownership",
        cookie: owner,
        payload: { method: "record" },
      },
    );
    expect(status).toBe(422);
    expect(body.error.code).toBe("CLAIM_REJECTED");
    expect(body.error.message).toContain("proof of ownership");
  });

  it("lands a proof upload pending, without granting access", async () => {
    const token = "HF-US-CO-DEN-00004501";
    const { body } = await call<{ result: { status: string } }>(app, {
      method: "POST",
      url: `/api/properties/${token}/verify-ownership`,
      cookie: owner,
      payload: { method: "proof", proofDocument: "Recorded deed" },
    });
    expect(body.result.status).toBe("pending");

    const after = await contributeFor(token, owner);
    expect(after.contribute.allowed).toBe(false);
    expect(after.contribute.ctaAction).toBe("ownerClaimStatus");
  });

  it("refuses an unrecognised proof document", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/properties/HF-US-CO-BLD-00000377/verify-ownership",
      cookie: owner,
      payload: { method: "proof", proofDocument: "A napkin" },
    });
    expect(status).toBe(400);
  });

  it("refuses ownership verification from an agent", async () => {
    const { status } = await call(app, {
      method: "POST",
      url: "/api/properties/HF-US-CO-AUR-00001604/verify-ownership",
      cookie: agent,
      payload: { method: "record" },
    });
    expect(status).toBe(403);
  });
});

describe("saved properties", () => {
  it("toggles a bookmark for the agent", async () => {
    const on = await call<{ saved: boolean }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/save`,
      cookie: agent,
    });
    expect(on.body.saved).toBe(true);

    const off = await call<{ saved: boolean }>(app, {
      method: "POST",
      url: `/api/properties/${SHOWCASE}/save`,
      cookie: agent,
    });
    expect(off.body.saved).toBe(false);
  });

  it("is an agent-only feature", async () => {
    for (const cookie of [owner, contractor]) {
      const { status } = await call(app, {
        method: "POST",
        url: `/api/properties/${SHOWCASE}/save`,
        cookie,
      });
      expect(status).toBe(403);
    }
  });

  it("saving claims nothing", async () => {
    await call(app, {
      method: "POST",
      url: "/api/properties/HF-US-CO-AUR-00001604/save",
      cookie: agent,
    });
    const body = await contributeFor("HF-US-CO-AUR-00001604", agent);
    expect(body.claimState.key).toBe("unclaimed");
    expect(body.contribute.allowed).toBe(false);
  });
});
