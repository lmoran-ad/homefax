import type { LedgerState } from "@homefax/contracts";
import { propertyEvents, type Database } from "@homefax/db";
import { buildChain, verifyLedger, type ChainableEvent } from "@homefax/ledger";
import { asc, eq } from "drizzle-orm";
import type { AppContext } from "../lib/context";
import { nowLabel } from "../lib/format";

type EventRow = typeof propertyEvents.$inferSelect;

const toChainable = (row: EventRow): ChainableEvent => ({
  id: row.publicId,
  eventType: row.eventType,
  occurredAt: row.occurredAt,
  title: row.title,
  description: row.description,
  verificationLevel: row.verificationLevel,
  visibility: row.visibility,
  metadata: row.metadata,
});

export async function verifyPropertyLedger(
  ctx: AppContext,
  propertyId: string,
): Promise<LedgerState> {
  const rows = await ctx.db
    .select()
    .from(propertyEvents)
    .where(eq(propertyEvents.propertyId, propertyId))
    .orderBy(asc(propertyEvents.occurredAt), asc(propertyEvents.publicId));

  const result = verifyLedger(
    rows.map((row) => ({
      ...toChainable(row),
      eventHash: row.eventHash,
      previousHash: row.previousHash,
    })),
  );

  return {
    valid: result.valid,
    checkedEvents: result.checkedEvents,
    invalidEventId: result.invalidEventId ?? null,
    verifiedAt: nowLabel(),
    genesisDate: rows[0]?.occurredAt ?? null,
  };
}

/**
 * Recomputes and persists the whole chain for one property.
 *
 * This runs after every append because chain order is (occurredAt, id): an
 * event dated last June, entered today, sorts into its historical position and
 * shifts the hash of everything after it. Only appending to the tail would
 * leave the chain silently wrong for exactly the backdated invoices this
 * product exists to capture.
 *
 * Must be called inside the same transaction as the append.
 */
export async function recomputeChain(
  tx: Database,
  propertyId: string,
): Promise<void> {
  const rows = await tx
    .select()
    .from(propertyEvents)
    .where(eq(propertyEvents.propertyId, propertyId))
    .orderBy(asc(propertyEvents.occurredAt), asc(propertyEvents.publicId));

  const links = buildChain(rows.map(toChainable));
  const rowByPublicId = new Map(rows.map((r) => [r.publicId, r]));

  for (const link of links) {
    const row = rowByPublicId.get(link.eventId);
    if (!row) continue;
    if (row.eventHash === link.hash && row.previousHash === link.previousHash) {
      continue;
    }
    await tx
      .update(propertyEvents)
      .set({ eventHash: link.hash, previousHash: link.previousHash })
      .where(eq(propertyEvents.id, row.id));
  }
}
