import type {
  AppendEventRequest,
  EventType,
  SystemKey,
  VerificationLevel,
  Visibility,
} from "@hometoken/contracts";
import {
  propertyDocuments,
  propertyEvents,
  propertySystems,
  type Database,
  type PropertyRow,
} from "@hometoken/db";
import { and, eq, sql } from "drizzle-orm";
import type { AppContext } from "../lib/context.js";
import { badRequest } from "../lib/errors.js";
import { formatDate, formatMoney } from "../lib/format.js";
import { recomputeChain } from "./ledger-service.js";
import { refreshHealthScore } from "./property-service.js";

/**
 * Maps a free-text system name onto a tracked system key. Contractors and
 * extraction both produce loose strings ("HVAC", "hvac replacement", "Water
 * Heater"), and an unrecognised one must simply leave the systems untouched
 * rather than guess.
 */
export function matchSystemKey(raw: string | null): SystemKey | null {
  const value = (raw ?? "").toLowerCase().trim();
  if (!value) return null;
  if (value.includes("hvac") || value.includes("furnace") || value.includes("condenser")) {
    return "hvac";
  }
  if (value.includes("roof")) return "roof";
  if (value.includes("water heater") || value.includes("waterheater")) {
    return "waterHeater";
  }
  if (value.includes("plumb")) return "plumbing";
  if (value.includes("electr")) return "electrical";
  if (value.includes("foundation") || value.includes("drainage")) return "foundation";
  return null;
}

/** Event types that represent work done, as opposed to a note or a document. */
const WORK_TYPES = new Set<EventType>([
  "SYSTEM_INSTALLATION",
  "IMPROVEMENT",
  "REPAIR",
]);

export type AppendInput = AppendEventRequest & {
  /** Distinguishes an agent entry from a contractor submission in the meta line. */
  attribution: string;
  contractorLicense?: string | null;
};

async function nextPublicId(tx: Database, propertyId: string, prefix: string) {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(propertyEvents)
    .where(eq(propertyEvents.propertyId, propertyId));
  const sequence = (row?.count ?? 0) + 1;
  return `${prefix}-${String(sequence).padStart(4, "0")}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

/**
 * Appends one event and brings the property back into a consistent state:
 * the chain is recomputed, any matching system is updated with a link to this
 * event as its source, and the cached health score is refreshed.
 *
 * All of it in one transaction — a half-applied append would leave a record
 * whose ledger says one thing and whose systems say another.
 */
export async function appendEvent(
  ctx: AppContext,
  property: PropertyRow,
  input: AppendInput,
  createdBy: string,
): Promise<{ publicId: string }> {
  if (!input.title.trim()) throw badRequest("A title is required");

  const metaBits = [
    input.contractor,
    input.amount != null ? formatMoney(input.amount) : "",
    input.permitNumber ? `Permit ${input.permitNumber}` : "",
    input.contractorLicense ? `License ${input.contractorLicense}` : "",
  ].filter((bit): bit is string => Boolean(bit));
  const meta = metaBits.length ? metaBits.join(" · ") : input.attribution;

  const publicId = await ctx.db.transaction(async (tx) => {
    const id = await nextPublicId(tx, property.id, "EV");

    const [event] = await tx
      .insert(propertyEvents)
      .values({
        publicId: id,
        propertyId: property.id,
        eventType: input.eventType,
        occurredAt: input.occurredAt,
        title: input.title.trim(),
        description: input.description || null,
        verificationLevel: input.verificationLevel,
        visibility: input.visibility,
        sourceName: input.contractor,
        sourceReference: input.permitNumber,
        metadata: {
          summary: meta,
          contractor: input.contractor,
          amount: input.amount,
          currency: "USD",
          permitNumber: input.permitNumber,
          systemType: input.systemType,
          materials: input.materials,
        },
        // Placeholder; recomputeChain writes the real value below, since the
        // hash depends on where this event sorts into history.
        eventHash: "pending",
        createdBy,
      })
      .returning();
    if (!event) throw badRequest("Could not append the event");

    if (input.documentId) {
      await tx
        .update(propertyDocuments)
        .set({ eventId: event.id, visibility: input.visibility })
        .where(
          and(
            eq(propertyDocuments.id, input.documentId),
            eq(propertyDocuments.propertyId, property.id),
          ),
        );
    }

    const systemKey = matchSystemKey(input.systemType);
    if (systemKey) {
      const [system] = await tx
        .select()
        .from(propertySystems)
        .where(
          and(
            eq(propertySystems.propertyId, property.id),
            eq(propertySystems.systemType, systemKey),
          ),
        )
        .limit(1);

      if (system) {
        // Work done resets the system's condition and re-sources it to this
        // event. A service call only updates the service date — servicing a
        // 13-year-old condenser does not make it new.
        const patch = WORK_TYPES.has(input.eventType)
          ? {
              status: "EXCELLENT" as const,
              verificationLevel: input.verificationLevel,
              sourceEventId: event.id,
              rows: [
                ["Installed", formatDate(input.occurredAt)],
                ["Recorded by", input.contractor || input.attribution],
                ["Source", "Approved record"],
              ] as [string, string][],
            }
          : {
              sourceEventId: event.id,
              rows: [
                ["Last service", formatDate(input.occurredAt)],
                ...system.rows.slice(1),
              ] as [string, string][],
            };

        await tx
          .update(propertySystems)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(propertySystems.id, system.id));
      }
    }

    await recomputeChain(tx, property.id);
    return id;
  });

  await refreshHealthScore(ctx, property.id);
  return { publicId };
}

export type { VerificationLevel, Visibility };
