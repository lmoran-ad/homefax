import { createHash } from "node:crypto";
import {
  canonicalizeEvent,
  GENESIS,
  type CanonicalLedgerEvent,
} from "./canonicalize";

export function sha256(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export function computeEventHash(event: CanonicalLedgerEvent): string {
  return sha256(canonicalizeEvent(event));
}

/** An event as the chain builder needs to see it. */
export type ChainableEvent = Omit<CanonicalLedgerEvent, "previousHash">;

export type ChainLink = {
  eventId: string;
  hash: string;
  previousHash: string;
};

/**
 * Chain order is (occurredAt, id) ascending — not row insertion order.
 *
 * That matters: a backdated event appended today sorts into its historical
 * position and rewrites every hash after it. The chain proves the *set* of
 * events is intact, not the order they were entered. Insertion order is
 * recoverable from `created_at`, which is outside the hash by design.
 */
export function sortForChain<T extends { id: string; occurredAt: string }>(
  events: readonly T[],
): T[] {
  return [...events].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Builds the full chain for one property, oldest first. */
export function buildChain(events: readonly ChainableEvent[]): ChainLink[] {
  let previousHash = GENESIS;
  const links: ChainLink[] = [];
  for (const event of sortForChain(events)) {
    const hash = computeEventHash({ ...event, previousHash });
    links.push({ eventId: event.id, hash, previousHash });
    previousHash = hash;
  }
  return links;
}

export { GENESIS };
