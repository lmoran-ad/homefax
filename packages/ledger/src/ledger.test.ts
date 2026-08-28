import { describe, expect, it } from "vitest";
import {
  buildChain,
  canonicalizeEvent,
  computeEventHash,
  GENESIS,
  sortForChain,
  stableStringify,
  verifyLedger,
  type ChainableEvent,
  type StoredLedgerEvent,
} from "./index";

const event = (
  id: string,
  occurredAt: string,
  overrides: Partial<ChainableEvent> = {},
): ChainableEvent => ({
  id,
  eventType: "REPAIR",
  occurredAt,
  title: `Event ${id}`,
  description: null,
  verificationLevel: "PROFESSIONAL_VERIFIED",
  visibility: "AUTHENTICATED",
  metadata: {},
  ...overrides,
});

const store = (events: readonly ChainableEvent[]): StoredLedgerEvent[] => {
  const links = new Map(buildChain(events).map((l) => [l.eventId, l]));
  return events.map((e) => {
    const link = links.get(e.id)!;
    return { ...e, eventHash: link.hash, previousHash: link.previousHash };
  });
};

describe("stableStringify", () => {
  it("is independent of key insertion order", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });

  it("sorts keys at every depth", () => {
    expect(stableStringify({ z: { d: 1, c: 2 } })).toBe('{"z":{"c":2,"d":1}}');
  });

  it("preserves array order, which is meaningful", () => {
    expect(stableStringify([2, 1])).toBe("[2,1]");
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
  });

  it("drops undefined members so optional fields do not shift the hash", () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe("computeEventHash", () => {
  it("returns a 64-character lowercase hex digest", () => {
    const hash = computeEventHash({ ...event("EV-1", "2024-01-01"), previousHash: GENESIS });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic across calls", () => {
    const canonical = { ...event("EV-1", "2024-01-01"), previousHash: GENESIS };
    expect(computeEventHash(canonical)).toBe(computeEventHash(canonical));
  });

  it("changes when any covered field changes", () => {
    const base = { ...event("EV-1", "2024-01-01"), previousHash: GENESIS };
    const baseline = computeEventHash(base);
    expect(computeEventHash({ ...base, title: "Different" })).not.toBe(baseline);
    expect(computeEventHash({ ...base, verificationLevel: "UNVERIFIED" })).not.toBe(baseline);
    expect(computeEventHash({ ...base, visibility: "PUBLIC" })).not.toBe(baseline);
    expect(computeEventHash({ ...base, metadata: { amount: 1 } })).not.toBe(baseline);
    expect(computeEventHash({ ...base, previousHash: "abc" })).not.toBe(baseline);
  });

  it("covers exactly the nine documented fields", () => {
    const canonical = { ...event("EV-1", "2024-01-01"), previousHash: GENESIS };
    expect(Object.keys(JSON.parse(canonicalizeEvent(canonical))).sort()).toEqual([
      "description",
      "eventType",
      "id",
      "metadata",
      "occurredAt",
      "previousHash",
      "title",
      "verificationLevel",
      "visibility",
    ]);
  });
});

describe("sortForChain", () => {
  it("orders by occurredAt then id", () => {
    const sorted = sortForChain([
      event("EV-3", "2024-05-01"),
      event("EV-1", "2024-01-01"),
      event("EV-2", "2024-01-01"),
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["EV-1", "EV-2", "EV-3"]);
  });
});

describe("buildChain", () => {
  it("seeds the first event with GENESIS", () => {
    const [first] = buildChain([event("EV-1", "2024-01-01")]);
    expect(first!.previousHash).toBe(GENESIS);
  });

  it("links each event to the hash of the one before it", () => {
    const links = buildChain([event("EV-1", "2024-01-01"), event("EV-2", "2024-02-01")]);
    expect(links[1]!.previousHash).toBe(links[0]!.hash);
  });

  it("returns an empty chain for a property with no events", () => {
    expect(buildChain([])).toEqual([]);
  });
});

describe("verifyLedger", () => {
  const events = [
    event("EV-1", "2024-01-01"),
    event("EV-2", "2024-02-01"),
    event("EV-3", "2024-03-01"),
  ];

  it("accepts an intact chain", () => {
    const result = verifyLedger(store(events));
    expect(result.valid).toBe(true);
    expect(result.checkedEvents).toBe(3);
    expect(result.invalidEventId).toBeUndefined();
  });

  it("rejects a chain whose historical event content was altered", () => {
    const stored = store(events);
    stored[1] = { ...stored[1]!, title: "Silently rewritten" };
    const result = verifyLedger(stored);
    expect(result.valid).toBe(false);
    expect(result.invalidEventId).toBe("EV-2");
  });

  it("rejects a chain whose stored hash was altered to match new content", () => {
    // Rewriting content *and* its own hash still breaks the link, because the
    // next event committed the old hash as its previousHash.
    const stored = store(events);
    const forgedTitle = "Silently rewritten";
    stored[1] = {
      ...stored[1]!,
      title: forgedTitle,
      eventHash: computeEventHash({
        ...event("EV-2", "2024-02-01", { title: forgedTitle }),
        previousHash: stored[1]!.previousHash!,
      }),
    };
    const result = verifyLedger(stored);
    expect(result.valid).toBe(false);
    expect(result.invalidEventId).toBe("EV-3");
  });

  it("rejects a chain missing an event", () => {
    const stored = store(events);
    const result = verifyLedger(stored.slice(0, 2).concat({ ...stored[2]!, eventHash: "0".repeat(64) }));
    expect(result.valid).toBe(false);
  });

  it("stays valid when a new event is appended and the chain recomputed", () => {
    const appended = [...events, event("EV-4", "2024-04-01")];
    expect(verifyLedger(store(appended)).valid).toBe(true);
    expect(verifyLedger(store(appended)).checkedEvents).toBe(4);
  });

  it("accepts an empty ledger", () => {
    expect(verifyLedger([])).toMatchObject({ valid: true, checkedEvents: 0 });
  });
});
