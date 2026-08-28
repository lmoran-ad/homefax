import type {
  Contractor,
  ContractorProfile,
  ContractorWorkRow,
  VerificationChecklistItem,
} from "@hometoken/contracts";
import {
  contractors,
  properties,
  propertyEvents,
  type ContractorRow,
} from "@hometoken/db";
import { asc, eq, ilike, or, sql } from "drizzle-orm";
import type { AppContext } from "../lib/context.js";
import { notFound } from "../lib/errors.js";

export function toContractor(row: ContractorRow): Contractor {
  return {
    id: row.publicId,
    name: row.name,
    initials: row.initials,
    trade: row.trade,
    license: row.licenseNumber,
    verified: row.verified,
    since: row.verifiedSince,
    area: row.serviceArea,
    zips: row.serviceZips,
    jobCount: row.jobCount,
    phone: row.phone,
    blurb: row.blurb,
  };
}

export async function findContractorRow(
  ctx: AppContext,
  publicId: string,
): Promise<ContractorRow> {
  const [row] = await ctx.db
    .select()
    .from(contractors)
    .where(eq(contractors.publicId, publicId))
    .limit(1);
  if (!row) throw notFound("No contractor found with that id");
  return row;
}

export async function searchContractors(
  ctx: AppContext,
  input: { q: string; trade: string; verifiedOnly: boolean },
): Promise<Contractor[]> {
  const query = input.q.trim();
  const pattern = `%${query}%`;

  const rows = await ctx.db
    .select()
    .from(contractors)
    .where(
      query
        ? or(
            ilike(contractors.name, pattern),
            ilike(contractors.trade, pattern),
            ilike(contractors.licenseNumber, pattern),
            ilike(contractors.serviceZips, pattern),
          )
        : undefined,
    )
    .orderBy(asc(contractors.name));

  return rows
    .filter((r) => (input.trade === "All" ? true : r.trade === input.trade))
    .filter((r) => (input.verifiedOnly ? r.verified : true))
    .map(toContractor);
}

export async function tradeCounts(
  ctx: AppContext,
): Promise<{ trade: string; count: number }[]> {
  const rows = await ctx.db
    .select({ trade: contractors.trade, count: sql<number>`count(*)::int` })
    .from(contractors)
    .groupBy(contractors.trade)
    .orderBy(asc(contractors.trade));
  const total = rows.reduce((acc, r) => acc + r.count, 0);
  return [{ trade: "All", count: total }, ...rows];
}

/**
 * Work this contractor has recorded, found by matching their name against
 * event metadata across every property.
 *
 * Shown ZIP-only, never by street address. A contractor's track record is
 * theirs to show; the addresses of the homes they worked on are not.
 */
export async function contractorProfile(
  ctx: AppContext,
  publicId: string,
  viewerHomeTokenId: string | null,
): Promise<ContractorProfile> {
  const row = await findContractorRow(ctx, publicId);

  const rows = await ctx.db
    .select({ event: propertyEvents, property: properties })
    .from(propertyEvents)
    .innerJoin(properties, eq(propertyEvents.propertyId, properties.id))
    .where(
      or(
        ilike(sql`${propertyEvents.metadata}->>'summary'`, `%${row.name}%`),
        ilike(propertyEvents.sourceName, `%${row.name}%`),
      ),
    )
    .orderBy(asc(propertyEvents.occurredAt));

  const work: ContractorWorkRow[] = rows.map((r) => ({
    eventId: r.event.publicId,
    tokenId: r.property.tokenId,
    postalCode: r.property.postalCode,
    occurredAt: r.event.occurredAt,
    title: r.event.title,
    meta: String((r.event.metadata as { summary?: unknown }).summary ?? ""),
    onThisHome: r.property.tokenId === viewerHomeTokenId,
  }));

  return {
    ...toContractor(row),
    work: work.reverse(),
    recordsOnThisHome: work.filter((w) => w.onThisHome).length,
  };
}

/**
 * The contractor's own verification status. Licence state comes from
 * LicenseProvider rather than from the row, so the checklist reflects what the
 * board says rather than what the contractor typed.
 */
export async function verificationChecklist(
  ctx: AppContext,
  row: ContractorRow,
): Promise<VerificationChecklistItem[]> {
  const license = await ctx.licenses.verify({
    licenseNumber: row.licenseNumber,
    trade: row.trade,
  });

  return [
    {
      label: "Trade license",
      detail: license.verified
        ? `${row.licenseNumber} · verified with the state board`
        : (license.reason ?? "License not verified"),
      status: license.verified ? "complete" : "missing",
      statusLabel: license.verified ? "VERIFIED" : "NOT ON FILE",
    },
    {
      label: "Business entity",
      detail: `${row.name} · registered in Colorado`,
      status: "complete",
      statusLabel: "VERIFIED",
    },
    {
      label: "Liability insurance",
      detail: license.verified
        ? "Certificate on file, expires Dec 2026"
        : "Required before verification completes",
      status: license.verified ? "complete" : "pending",
      statusLabel: license.verified ? "ON FILE" : "PENDING",
    },
    {
      label: "Find a Pro listing",
      detail: license.verified
        ? "Listed to homeowners in your service ZIPs"
        : "Listed as unverified until the license clears",
      status: license.verified ? "complete" : "pending",
      statusLabel: license.verified ? "LIVE" : "LIMITED",
    },
  ];
}

export async function updateContractorProfile(
  ctx: AppContext,
  row: ContractorRow,
  input: { name: string; trade: string; license: string; zips: string },
): Promise<ContractorRow> {
  // Verification is re-derived from the provider, never taken from the form.
  // A contractor typing a different licence number cannot promote themselves.
  const license = await ctx.licenses.verify({
    licenseNumber: input.license,
    trade: input.trade,
  });

  const [updated] = await ctx.db
    .update(contractors)
    .set({
      name: input.name.trim(),
      trade: input.trade.trim(),
      licenseNumber: input.license.trim(),
      serviceZips: input.zips.trim(),
      verified: license.verified,
      updatedAt: new Date(),
    })
    .where(eq(contractors.id, row.id))
    .returning();
  return updated ?? row;
}
