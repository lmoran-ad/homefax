import type { TransferRequest, TransferResult } from "@homefax/contracts";
import {
  ownershipPeriods,
  propertyEvents,
  tokenTransfers,
  type PropertyRow,
} from "@homefax/db";
import { desc, eq, sql } from "drizzle-orm";
import type { AppContext } from "../lib/context";
import { badRequest } from "../lib/errors";
import { formatDate } from "../lib/format";
import { recomputeChain, verifyPropertyLedger } from "./ledger-service";
import type { SessionUserRecord } from "./auth-service";

/**
 * Hands administration of the record to the homeowner.
 *
 * This is a stewardship transfer and nothing more: no deed is recorded and no
 * legal ownership changes. What moves is who approves what enters the record.
 * The history is retained in full — which is the point being demonstrated, so
 * the retained-event count is reported back explicitly.
 */
export async function transferToOwner(
  ctx: AppContext,
  property: PropertyRow,
  user: SessionUserRecord,
  request: TransferRequest,
): Promise<TransferResult> {
  const periods = await ctx.db
    .select()
    .from(ownershipPeriods)
    .where(eq(ownershipPeriods.propertyId, property.id))
    .orderBy(desc(ownershipPeriods.sequenceNumber));

  const nextNumber = (periods[0]?.sequenceNumber ?? 0) + 1;
  const date = request.transferDate;
  const label = request.newOwnerName.trim();
  const email = request.newOwnerEmail.trim();

  const transferPublicId = `EV-TR-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const startPublicId = `EV-OP-${Date.now().toString(36).slice(-4).toUpperCase()}`;

  await ctx.db.transaction(async (tx) => {
    const [transferEvent] = await tx
      .insert(propertyEvents)
      .values({
        publicId: transferPublicId,
        propertyId: property.id,
        eventType: "TRANSFER",
        occurredAt: date,
        title: "HomeFax transferred to homeowner",
        description:
          "The property record was handed to the homeowner, who now approves what enters it. Property history retained in full. This is not a legal title transfer and no deed was recorded.",
        verificationLevel: "PROFESSIONAL_VERIFIED",
        visibility: "PUBLIC",
        metadata: {
          summary: `To ${label} · ${email} · initiated by ${user.displayName}, ${user.roleLabel}`,
          toStewardLabel: label,
          toStewardEmail: email,
        },
        eventHash: "pending",
        createdBy: user.id,
      })
      .returning();
    if (!transferEvent) throw badRequest("Could not record the transfer");

    await tx.insert(propertyEvents).values({
      publicId: startPublicId,
      propertyId: property.id,
      eventType: "OWNERSHIP_PERIOD_STARTED",
      occurredAt: date,
      title: `Ownership period #${nextNumber} begins`,
      description: null,
      verificationLevel: "PROFESSIONAL_VERIFIED",
      visibility: "PUBLIC",
      metadata: {
        summary: "Current ownership period · prior owners are not named",
      },
      eventHash: "pending",
      createdBy: user.id,
    });

    // Close the outgoing period and open a new one. The new period carries no
    // owner name, same as every other period on the record.
    for (const period of periods.filter((p) => p.isCurrent)) {
      await tx
        .update(ownershipPeriods)
        .set({
          isCurrent: false,
          label: `Ownership period #${period.sequenceNumber}`,
          rangeLabel: period.rangeLabel.replace(
            " – present",
            ` – ${formatDate(date)}`,
          ),
        })
        .where(eq(ownershipPeriods.id, period.id));
    }

    await tx.insert(ownershipPeriods).values({
      propertyId: property.id,
      sequenceNumber: nextNumber,
      label: "Current ownership period",
      rangeLabel: `${formatDate(date)} – present`,
      isCurrent: true,
      verificationLevel: "PROFESSIONAL_VERIFIED",
    });

    await tx.insert(tokenTransfers).values({
      propertyId: property.id,
      fromStewardLabel: user.displayName,
      toStewardLabel: label,
      toStewardEmail: email,
      status: "COMPLETED",
      initiatedBy: user.id,
      completedAt: new Date(),
      transferEventId: transferEvent.id,
    });

    await recomputeChain(tx, property.id);
  });

  const [counted] = await ctx.db
    .select({ count: sql<number>`count(*)::int` })
    .from(propertyEvents)
    .where(eq(propertyEvents.propertyId, property.id));

  return {
    newOwnerName: label,
    newOwnerEmail: email,
    ownershipPeriodNumber: nextNumber,
    retainedEventCount: counted?.count ?? 0,
    transferEventId: transferPublicId,
    ledger: await verifyPropertyLedger(ctx, property.id),
  };
}
