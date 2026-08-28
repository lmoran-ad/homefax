import {
  calculateHealthScore,
  type DocumentSummary,
  type PropertyDetail,
  type PropertyEvent,
  type PropertySummary,
  type PropertySystem,
  type SystemKey,
  type SystemStatus,
  type VerificationLevel,
  type Visibility,
} from "@homefax/contracts";
import {
  ownershipPeriods,
  properties,
  propertyDocuments,
  propertyEvents,
  propertySystems,
  type PropertyRow,
} from "@homefax/db";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { AppContext } from "../lib/context.js";
import { propertyNotFound } from "../lib/errors.js";
import { verifyPropertyLedger } from "./ledger-service.js";

export type Viewer = {
  /** Null for an unauthenticated caller, e.g. the public landing page. */
  profileId: string | null;
  role: "agent" | "homeowner" | "contractor" | null;
};

const num = (value: string | null): number | null =>
  value === null ? null : Number(value);

export function toSummary(row: PropertyRow, eventCount: number): PropertySummary {
  return {
    tokenId: row.tokenId,
    address: row.addressLine1,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    parcelId: row.parcelId,
    estimatedValue: num(row.currentEstimatedValue),
    healthScore: row.currentHealthScore,
    eventCount,
    isShowcase: row.isShowcase,
    isProvisioned: row.isProvisioned,
  };
}

/**
 * Document body access. Metadata (name, kind, sha256) is visible to any
 * signed-in user so the record stays legible, but a RESTRICTED document's
 * bytes are never served — the demo's insurance claim record has to actually
 * be unreadable, not merely styled as if it were.
 */
export function canReadDocumentBody(
  visibility: Visibility,
  viewer: Viewer,
): boolean {
  if (visibility === "RESTRICTED") return false;
  if (visibility === "PUBLIC") return true;
  return viewer.profileId !== null;
}

export async function findPropertyRow(
  ctx: AppContext,
  tokenId: string,
): Promise<PropertyRow> {
  const [row] = await ctx.db
    .select()
    .from(properties)
    .where(eq(properties.tokenId, tokenId))
    .limit(1);
  if (!row) throw propertyNotFound(tokenId);
  return row;
}

export async function searchProperties(
  ctx: AppContext,
  query: string,
): Promise<PropertySummary[]> {
  const trimmed = query.trim();
  const pattern = `%${trimmed}%`;

  // Postgres ilike across the fields the search bar accepts: address, city,
  // state, postal code, token ID and parcel ID. No search engine for this.
  const rows = trimmed
    ? await ctx.db
        .select()
        .from(properties)
        .where(
          or(
            ilike(properties.addressLine1, pattern),
            ilike(properties.city, pattern),
            ilike(properties.state, pattern),
            ilike(properties.postalCode, pattern),
            ilike(properties.tokenId, pattern),
            ilike(properties.parcelId, pattern),
          ),
        )
        .orderBy(desc(properties.isShowcase), asc(properties.addressLine1))
    : await ctx.db
        .select()
        .from(properties)
        .orderBy(desc(properties.isShowcase), asc(properties.addressLine1));

  const counts = await eventCounts(ctx, rows.map((r) => r.id));
  return rows.map((row) => toSummary(row, counts.get(row.id) ?? 0));
}

export async function eventCounts(
  ctx: AppContext,
  propertyIds: string[],
): Promise<Map<string, number>> {
  if (propertyIds.length === 0) return new Map();
  const rows = await ctx.db
    .select({
      propertyId: propertyEvents.propertyId,
      count: sql<number>`count(*)::int`,
    })
    .from(propertyEvents)
    .where(
      sql`${propertyEvents.propertyId} in ${sql.raw(
        `(${propertyIds.map((id) => `'${id}'::uuid`).join(",")})`,
      )}`,
    )
    .groupBy(propertyEvents.propertyId);
  return new Map(rows.map((r) => [r.propertyId, r.count]));
}

export async function listSummaries(
  ctx: AppContext,
  tokenIds: string[],
): Promise<PropertySummary[]> {
  if (tokenIds.length === 0) return [];
  const rows = await ctx.db
    .select()
    .from(properties)
    .where(
      sql`${properties.tokenId} in ${sql.raw(
        `(${tokenIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})`,
      )}`,
    );
  const counts = await eventCounts(ctx, rows.map((r) => r.id));
  const byToken = new Map(
    rows.map((row) => [row.tokenId, toSummary(row, counts.get(row.id) ?? 0)]),
  );
  // Preserve the caller's ordering.
  return tokenIds.flatMap((id) => {
    const summary = byToken.get(id);
    return summary ? [summary] : [];
  });
}

export async function getPropertyDetail(
  ctx: AppContext,
  tokenId: string,
  viewer: Viewer,
): Promise<PropertyDetail> {
  const row = await findPropertyRow(ctx, tokenId);

  const [eventRows, systemRows, ownershipRows, documentRows] = await Promise.all([
    ctx.db
      .select()
      .from(propertyEvents)
      .where(eq(propertyEvents.propertyId, row.id))
      .orderBy(desc(propertyEvents.occurredAt), desc(propertyEvents.publicId)),
    ctx.db
      .select()
      .from(propertySystems)
      .where(eq(propertySystems.propertyId, row.id)),
    ctx.db
      .select()
      .from(ownershipPeriods)
      .where(eq(ownershipPeriods.propertyId, row.id))
      .orderBy(desc(ownershipPeriods.sequenceNumber)),
    ctx.db
      .select()
      .from(propertyDocuments)
      .where(eq(propertyDocuments.propertyId, row.id))
      .orderBy(desc(propertyDocuments.createdAt)),
  ]);

  const eventById = new Map(eventRows.map((e) => [e.id, e]));
  const publicIdByUuid = new Map(eventRows.map((e) => [e.id, e.publicId]));

  const documents: DocumentSummary[] = documentRows.map((d) => {
    const event = d.eventId ? eventById.get(d.eventId) : undefined;
    return {
      id: d.id,
      name: d.fileName,
      kind: d.documentType ?? "Document",
      visibility: d.visibility as Visibility,
      sha256: d.sha256,
      eventId: event?.publicId ?? null,
      eventTitle: event?.title ?? null,
      occurredAt: event?.occurredAt ?? null,
      // Bodies are fetched on demand through the documents route, which
      // re-checks visibility. Nothing is inlined here.
      text: null,
    };
  });

  const documentsByEvent = new Map<string, DocumentSummary[]>();
  for (let i = 0; i < documentRows.length; i += 1) {
    const row_ = documentRows[i]!;
    if (!row_.eventId) continue;
    const list = documentsByEvent.get(row_.eventId) ?? [];
    list.push(documents[i]!);
    documentsByEvent.set(row_.eventId, list);
  }

  const events: PropertyEvent[] = eventRows.map((e) => ({
    id: e.publicId,
    eventType: e.eventType as PropertyEvent["eventType"],
    occurredAt: e.occurredAt,
    title: e.title,
    meta: String((e.metadata as { summary?: unknown }).summary ?? ""),
    description: e.description,
    verificationLevel: e.verificationLevel as VerificationLevel,
    visibility: e.visibility as Visibility,
    supersedesEventId: e.supersedesEventId
      ? (publicIdByUuid.get(e.supersedesEventId) ?? null)
      : null,
    metadata: e.metadata,
    documents: documentsByEvent.get(e.id) ?? [],
    eventHash: e.eventHash,
    previousHash: e.previousHash,
  }));

  const systems: PropertySystem[] = systemRows
    .map((s) => ({
      key: s.systemType as SystemKey,
      name: s.displayName,
      status: s.status as SystemStatus,
      verificationLevel: s.verificationLevel as VerificationLevel,
      sourceEventId: s.sourceEventId
        ? (publicIdByUuid.get(s.sourceEventId) ?? null)
        : null,
      hidden: s.hidden,
      rows: s.rows,
    }))
    .sort((a, b) => SYSTEM_ORDER.indexOf(a.key) - SYSTEM_ORDER.indexOf(b.key));

  const health = calculateHealthScore(
    systems.map((s) => ({ key: s.key, status: s.status })),
  );
  const ledger = await verifyPropertyLedger(ctx, row.id);
  const listing = await ctx.mls.getListing(row.parcelId);

  return {
    ...toSummary(row, eventRows.length),
    facts: {
      propertyType: row.propertyType ?? "Single family, detached",
      yearBuilt: row.yearBuilt ?? 0,
      bedrooms: num(row.bedrooms) ?? 0,
      bathrooms: num(row.bathrooms) ?? 0,
      livingSqft: row.livingSqft ?? 0,
      lotSqft: row.lotSqft ?? 0,
    },
    systems,
    ownership: ownershipRows.map((o) => ({
      sequenceNumber: o.sequenceNumber,
      label: o.label,
      range: o.rangeLabel,
      verificationLevel: o.verificationLevel as VerificationLevel,
      isCurrent: o.isCurrent,
    })),
    events,
    documents,
    health,
    ledger,
    mlsNumber: listing?.mlsNumber ?? null,
  };
}

const SYSTEM_ORDER: SystemKey[] = [
  "roof",
  "hvac",
  "waterHeater",
  "electrical",
  "plumbing",
  "foundation",
  "other",
];

/** Keeps the cached score on `properties` in step with the systems table. */
export async function refreshHealthScore(
  ctx: AppContext,
  propertyId: string,
): Promise<number> {
  const rows = await ctx.db
    .select()
    .from(propertySystems)
    .where(eq(propertySystems.propertyId, propertyId));
  const health = calculateHealthScore(
    rows.map((s) => ({
      key: s.systemType as SystemKey,
      status: s.status as SystemStatus,
    })),
  );
  await ctx.db
    .update(properties)
    .set({ currentHealthScore: health.score, updatedAt: new Date() })
    .where(eq(properties.id, propertyId));
  return health.score;
}

export async function findByAddress(
  ctx: AppContext,
  address: string,
): Promise<PropertyRow | null> {
  const needle = address.trim();
  if (!needle) return null;

  const [exact] = await ctx.db
    .select()
    .from(properties)
    .where(ilike(properties.addressLine1, needle))
    .limit(1);
  if (exact) return exact;

  const [prefix] = await ctx.db
    .select()
    .from(properties)
    .where(ilike(properties.addressLine1, `${needle}%`))
    .limit(1);
  if (prefix) return prefix;

  const [contains] = await ctx.db
    .select()
    .from(properties)
    .where(
      or(
        ilike(properties.addressLine1, `%${needle}%`),
        and(
          ilike(sql`${properties.addressLine1} || ', ' || ${properties.city}`, `%${needle}%`),
        ),
      ),
    )
    .limit(1);
  return contains ?? null;
}
