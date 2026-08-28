/**
 * Deterministic JSON serialization.
 *
 * `JSON.stringify` preserves insertion order, which means the same logical
 * event can serialize two different ways depending on how it was constructed
 * or how the database happened to return a `jsonb` column. That would make the
 * hash chain spuriously invalid. Sorting object keys at every depth removes
 * that dependency: the same values always produce the same bytes.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

/**
 * The exact set of fields covered by an event's hash. Anything outside this
 * shape (row timestamps, the surrogate primary key, presentation-only columns)
 * is deliberately excluded so it can change without invalidating history.
 */
export type CanonicalLedgerEvent = {
  id: string;
  eventType: string;
  occurredAt: string;
  title: string;
  description: string | null;
  verificationLevel: string;
  visibility: string;
  metadata: unknown;
  previousHash: string;
};

export const GENESIS = "GENESIS";

export function canonicalizeEvent(event: CanonicalLedgerEvent): string {
  // Field order here is irrelevant — stableStringify sorts — but the field
  // *set* is the contract. Adding a field is a breaking change to every
  // existing chain.
  return stableStringify({
    id: event.id,
    eventType: event.eventType,
    occurredAt: event.occurredAt,
    title: event.title,
    description: event.description ?? null,
    verificationLevel: event.verificationLevel,
    visibility: event.visibility,
    metadata: event.metadata ?? {},
    previousHash: event.previousHash,
  });
}
