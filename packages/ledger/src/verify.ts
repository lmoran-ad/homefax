import { buildChain, type ChainableEvent } from "./hash";

/** An event as stored, carrying the hashes recorded when it was appended. */
export type StoredLedgerEvent = ChainableEvent & {
  eventHash: string;
  previousHash: string | null;
};

export type LedgerVerification = {
  valid: boolean;
  checkedEvents: number;
  /** First event whose recomputed hash disagrees with what was stored. */
  invalidEventId?: string;
  verifiedAt: string;
};

/**
 * Recomputes the whole chain from event content and compares it against the
 * stored hashes. A mismatch means a committed event's content changed after it
 * was appended — which the append-only store is supposed to make impossible,
 * so this is a genuine integrity alarm rather than an expected state.
 */
export function verifyLedger(
  events: readonly StoredLedgerEvent[],
): LedgerVerification {
  const expected = buildChain(events);
  const byId = new Map(events.map((e) => [e.id, e]));
  const verifiedAt = new Date().toISOString();

  for (const link of expected) {
    const stored = byId.get(link.eventId);
    if (!stored) {
      return {
        valid: false,
        checkedEvents: expected.length,
        invalidEventId: link.eventId,
        verifiedAt,
      };
    }
    if (
      stored.eventHash !== link.hash ||
      (stored.previousHash ?? "GENESIS") !== link.previousHash
    ) {
      return {
        valid: false,
        checkedEvents: expected.length,
        invalidEventId: link.eventId,
        verifiedAt,
      };
    }
  }

  return { valid: true, checkedEvents: expected.length, verifiedAt };
}
