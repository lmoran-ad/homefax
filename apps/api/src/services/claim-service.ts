import type {
  AgentClaimRequest,
  Claim,
  ClaimResult,
  ClaimState,
  ContributeState,
  HomeClaim,
  OwnerClaimRequest,
  SeededRecordStats,
} from "@homefax/contracts";
import {
  claims,
  homeClaims,
  ownershipPeriods,
  profiles,
  properties,
  propertyDocuments,
  propertyEvents,
  type ClaimRow,
  type HomeClaimRow,
  type PropertyRow,
} from "@homefax/db";
import { and, desc, eq, sql } from "drizzle-orm";
import type { AppContext } from "../lib/context.js";
import { claimRejected, forbidden } from "../lib/errors.js";
import { addDays, daysUntil, formatDate, isPast, today } from "../lib/format.js";
import type { SessionUserRecord } from "./auth-service.js";

const AGENT_CLAIM_DAYS = { mls: 90, seller: 90, title: 30 } as const;

/**
 * A claim past its expiry is treated as expired wherever it is read, without
 * waiting for a background job to rewrite the row. Time-boxing only means
 * something if it takes effect on the date it says.
 */
function effectiveStatus(row: ClaimRow): ClaimRow["status"] {
  if (row.status === "active" && row.expiresAt && isPast(row.expiresAt)) {
    return "expired";
  }
  return row.status;
}

export function toClaim(row: ClaimRow, tokenId: string): Claim {
  return {
    tokenId,
    status: effectiveStatus(row) as Claim["status"],
    method: row.method,
    mlsNumber: row.mlsNumber,
    escrowNumber: row.escrowNumber,
    agentName: row.agentName,
    claimedAt: row.claimedAt,
    expiresAt: row.expiresAt,
    daysUntilExpiry: row.expiresAt ? daysUntil(row.expiresAt) : null,
  };
}

export function toHomeClaim(row: HomeClaimRow, tokenId: string): HomeClaim {
  return {
    tokenId,
    status: row.status as HomeClaim["status"],
    method: row.method,
    verifiedAt: row.verifiedAt,
    requestedAt: row.requestedAt,
  };
}

export async function findAgentClaim(
  ctx: AppContext,
  propertyId: string,
): Promise<ClaimRow | null> {
  const rows = await ctx.db
    .select()
    .from(claims)
    .where(eq(claims.propertyId, propertyId))
    .orderBy(desc(claims.createdAt));
  // Claims are non-exclusive, so a parcel can carry several. The live one is
  // the newest that has not expired or been released.
  return (
    rows.find((r) => {
      const status = effectiveStatus(r);
      return status === "active" || status === "pending";
    }) ?? null
  );
}

export async function findHomeClaim(
  ctx: AppContext,
  propertyId: string,
  ownerId: string,
): Promise<HomeClaimRow | null> {
  const [row] = await ctx.db
    .select()
    .from(homeClaims)
    .where(
      and(eq(homeClaims.propertyId, propertyId), eq(homeClaims.ownerId, ownerId)),
    )
    .limit(1);
  return row ?? null;
}

export async function claimStateFor(
  ctx: AppContext,
  property: PropertyRow,
  user: SessionUserRecord | null,
): Promise<ClaimState> {
  const claim = await findAgentClaim(ctx, property.id);
  if (!claim) return { key: "unclaimed", label: "UNCLAIMED" };

  const status = effectiveStatus(claim);
  if (status === "pending") {
    return { key: "pending", label: "CLAIM PENDING OWNER CONSENT" };
  }
  if (status !== "active") return { key: "unclaimed", label: "UNCLAIMED" };
  if (!user || claim.agentId !== user.id) {
    return { key: "other", label: "CLAIMED BY ANOTHER AGENT" };
  }
  return { key: "active", label: "YOU ARE THE STEWARD" };
}

const ALLOWED: ContributeState = {
  allowed: true,
  title: null,
  body: null,
  ctaLabel: null,
  ctaAction: null,
};

/**
 * The single authority on whether this user may write to this record.
 *
 * Every write path calls it — append, extraction approval, transfer, export,
 * Ask This Home. The web renders its lock panel from the same object, so the
 * UI cannot drift out of step with what the server will actually permit.
 */
export async function contributeState(
  ctx: AppContext,
  property: PropertyRow,
  user: SessionUserRecord | null,
): Promise<ContributeState> {
  if (!user) {
    return {
      allowed: false,
      title: "Sign in to contribute",
      body: "The property record is readable, but adding to it requires an account.",
      ctaLabel: "Sign in",
      ctaAction: null,
    };
  }

  if (user.role === "homeowner") {
    const claim = await findHomeClaim(ctx, property.id, user.id);
    if (claim?.status === "active") return ALLOWED;
    if (claim?.status === "pending") {
      return {
        allowed: false,
        title: "Ownership verification pending",
        body: "You uploaded proof of ownership for this property. Until the recorder match completes you can read the county-seeded record, but you cannot add records or approve contractor submissions.",
        ctaLabel: "View verification status",
        ctaAction: "ownerClaimStatus",
      };
    }
    return {
      allowed: false,
      title: "This is not one of your homes",
      body: "Add it from your dashboard and verify ownership to contribute records.",
      ctaLabel: "Add this home",
      ctaAction: "ownerClaim",
    };
  }

  if (user.role === "agent") {
    const state = await claimStateFor(ctx, property, user);
    if (state.key === "active") return ALLOWED;
    if (state.key === "pending") {
      return {
        allowed: false,
        title: "Claim pending owner consent",
        body: "The owner of record has been asked to grant stewardship. Until they respond this record is read-only for you.",
        ctaLabel: "View claim status",
        ctaAction: "claimStatus",
      };
    }
    return {
      allowed: false,
      title: "Claim stewardship to contribute",
      body: "This HomeFax was seeded from county records and is not yet claimed. Claim it by MLS listing, seller authorization or title at closing to add records, ask grounded questions and export the report.",
      ctaLabel: "Claim HomeFax",
      ctaAction: "claim",
    };
  }

  // Contractors never write from a property record. They submit from Jobs,
  // where the homeowner accepts or declines the proposal — which is what keeps
  // a submission a proposal rather than an edit.
  return {
    allowed: false,
    title: "Read-only record",
    body: "Contractors submit work from the Jobs workspace rather than from a property record.",
    ctaLabel: "Go to Jobs",
    ctaAction: "jobs",
  };
}

export async function requireContribute(
  ctx: AppContext,
  property: PropertyRow,
  user: SessionUserRecord | null,
): Promise<void> {
  const state = await contributeState(ctx, property, user);
  if (!state.allowed) {
    throw forbidden(state.title ?? "You cannot contribute to this record");
  }
}

export async function seededRecordStats(
  ctx: AppContext,
  property: PropertyRow,
): Promise<SeededRecordStats> {
  const [[events], [documents], [periods]] = await Promise.all([
    ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertyEvents)
      .where(eq(propertyEvents.propertyId, property.id)),
    ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(propertyDocuments)
      .where(eq(propertyDocuments.propertyId, property.id)),
    ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(ownershipPeriods)
      .where(eq(ownershipPeriods.propertyId, property.id)),
  ]);

  return {
    events: events?.count ?? 0,
    documents: documents?.count ?? 0,
    ownershipPeriods: periods?.count ?? 0,
    healthScore: property.currentHealthScore ?? 0,
  };
}

export async function submitAgentClaim(
  ctx: AppContext,
  property: PropertyRow,
  user: SessionUserRecord,
  request: AgentClaimRequest,
): Promise<ClaimResult> {
  if (user.role !== "agent") {
    throw forbidden("Only an agent can claim stewardship of a listing");
  }

  const claimedAt = today();
  let method: string;
  let status: "active" | "pending";
  let mlsNumber: string | null = null;
  let escrowNumber: string | null = null;
  let expiresAt: string;

  if (request.method === "mls") {
    // Verified against the parcel's real listing, not merely well-formed. The
    // MLS already proved the agency relationship, which is why this path can
    // grant immediately where seller authorization cannot.
    const result = await ctx.mls.verifyListingAgent({
      parcelId: property.parcelId,
      mlsNumber: request.mlsNumber,
    });
    if (!result.ok) {
      throw claimRejected(
        result.expected
          ? `MLS ${request.mlsNumber.trim()} does not match a listing at this address. The listing agent of record for ${result.expected} is the only agent who can claim by MLS.`
          : "No MLS listing of record was found for this parcel.",
      );
    }
    method = "MLS";
    status = "active";
    mlsNumber = result.listing.mlsNumber;
    expiresAt = addDays(claimedAt, AGENT_CLAIM_DAYS.mls);
  } else if (request.method === "title") {
    method = "Title & escrow";
    status = "active";
    escrowNumber = request.escrowNumber.trim();
    expiresAt = addDays(claimedAt, AGENT_CLAIM_DAYS.title);
  } else {
    // Seller authorization cannot grant on its own — the owner has to respond.
    method = "Seller authorization";
    status = "pending";
    expiresAt = addDays(claimedAt, AGENT_CLAIM_DAYS.seller);
  }

  await ctx.db.insert(claims).values({
    propertyId: property.id,
    agentId: user.id,
    agentName: user.displayName,
    status,
    method,
    mlsNumber,
    escrowNumber,
    claimedAt,
    expiresAt,
  });

  return {
    status,
    method,
    claimedAt,
    expiresAt,
    reference: mlsNumber ?? escrowNumber,
  };
}

export async function submitOwnerClaim(
  ctx: AppContext,
  property: PropertyRow,
  user: SessionUserRecord,
  request: OwnerClaimRequest,
): Promise<ClaimResult> {
  if (user.role !== "homeowner") {
    throw forbidden("Only a homeowner can verify ownership of a property");
  }

  const claimedAt = today();
  let method: string;
  let status: "active" | "pending";

  if (request.method === "record") {
    const owner = await ctx.deeds.ownerOfRecord(property.parcelId);
    if (owner !== user.displayName) {
      throw claimRejected(
        `The owner of record for this parcel does not match ${user.displayName}. If you do own it, upload proof of ownership instead and the recorder match will be reviewed.`,
      );
    }
    method = "County record match";
    status = "active";
  } else {
    method = `Proof of ownership · ${request.proofDocument}`;
    status = "pending";
  }

  const existing = await findHomeClaim(ctx, property.id, user.id);
  const values = {
    status,
    method,
    verifiedAt: status === "active" ? claimedAt : null,
    requestedAt: status === "pending" ? claimedAt : null,
  };

  if (existing) {
    await ctx.db.update(homeClaims).set(values).where(eq(homeClaims.id, existing.id));
  } else {
    await ctx.db
      .insert(homeClaims)
      .values({ propertyId: property.id, ownerId: user.id, ...values });
  }

  if (!user.ownedTokenId) {
    await ctx.db
      .update(profiles)
      .set({ ownedTokenId: property.tokenId })
      .where(eq(profiles.id, user.id));
  }

  return { status, method, claimedAt, expiresAt: null, reference: null };
}

export async function releaseClaim(
  ctx: AppContext,
  property: PropertyRow,
  user: SessionUserRecord,
): Promise<void> {
  const claim = await findAgentClaim(ctx, property.id);
  if (!claim || claim.agentId !== user.id) {
    throw forbidden("You do not hold stewardship of this HomeFax");
  }
  // Releasing changes the claim, never the record. The events, documents and
  // chain are untouched — that separation is the whole point of stewardship
  // being authorization rather than ownership.
  await ctx.db
    .update(claims)
    .set({ status: "released", releasedAt: new Date() })
    .where(eq(claims.id, claim.id));
}

/** The agent's book: every HomeFax currently under their stewardship. */
export async function listAgentBook(
  ctx: AppContext,
  agentId: string,
): Promise<{ property: PropertyRow; claim: Claim }[]> {
  const rows = await ctx.db
    .select({ claim: claims, property: properties })
    .from(claims)
    .innerJoin(properties, eq(claims.propertyId, properties.id))
    .where(eq(claims.agentId, agentId))
    .orderBy(desc(claims.createdAt));

  return rows
    .filter((r) => {
      const status = effectiveStatus(r.claim);
      return status === "active" || status === "pending";
    })
    .map((r) => ({
      property: r.property,
      claim: toClaim(r.claim, r.property.tokenId),
    }));
}

export async function listOwnerHomes(
  ctx: AppContext,
  ownerId: string,
): Promise<{ property: PropertyRow; claim: HomeClaim }[]> {
  const rows = await ctx.db
    .select({ claim: homeClaims, property: properties })
    .from(homeClaims)
    .innerJoin(properties, eq(homeClaims.propertyId, properties.id))
    .where(eq(homeClaims.ownerId, ownerId))
    .orderBy(desc(homeClaims.createdAt));

  return rows.map((r) => ({
    property: r.property,
    claim: toHomeClaim(r.claim, r.property.tokenId),
  }));
}

export { formatDate };
