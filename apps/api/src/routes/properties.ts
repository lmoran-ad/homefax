import {
  AppendEventRequestSchema,
  AskRequestSchema,
  ExtractionRequestSchema,
  ProvisionRequestSchema,
  PropertySearchRequestSchema,
  TransferRequestSchema,
  type PropertySummary,
} from "@homefax/contracts";
import {
  ownershipPeriods,
  properties,
  propertyEvents,
  propertySystems,
  savedProperties,
} from "@homefax/db";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../lib/context";
import { badRequest, forbidden, paymentRequired } from "../lib/errors";
import { formatDate, formatMoney, today } from "../lib/format";
import {
  askQuota,
  askUsed,
  consumeAskQuestion,
  PAYWALLS,
} from "../services/billing-service";
import {
  claimStateFor,
  contributeState,
  findAgentClaim,
  findHomeClaim,
  releaseClaim,
  requireContribute,
  seededRecordStats,
  submitAgentClaim,
  submitOwnerClaim,
  toClaim,
  toHomeClaim,
} from "../services/claim-service";
import {
  AgentClaimRequestSchema,
  OwnerClaimRequestSchema,
} from "@homefax/contracts";
import { readDocumentBody } from "../services/document-service";
import { appendEvent } from "../services/event-service";
import { extract, markApproved } from "../services/extraction-service";
import { recomputeChain, verifyPropertyLedger } from "../services/ledger-service";
import { answerQuestion } from "../services/ask-home-service";
import {
  findByAddress,
  findPropertyRow,
  getPropertyDetail,
  listSummaries,
  refreshHealthScore,
  searchProperties,
  toSummary,
  type Viewer,
} from "../services/property-service";
import { transferToOwner } from "../services/transfer-service";

const TokenParams = z.object({ tokenId: z.string().min(3) });

export function registerPropertyRoutes(
  app: FastifyInstance,
  ctx: AppContext,
): void {
  const viewerOf = (user: unknown): Viewer => {
    const u = user as { id?: string; role?: string } | null;
    return {
      profileId: u?.id ?? null,
      role: (u?.role as Viewer["role"]) ?? null,
    };
  };

  app.get("/properties/search", async (request) => {
    const { q } = PropertySearchRequestSchema.parse(request.query);
    return { query: q, results: await searchProperties(ctx, q) };
  });

  app.get("/properties/recent", async () => {
    const results = await searchProperties(ctx, "");
    return { results: results.slice(0, 3) };
  });

  app.get("/properties/lookup", async (request) => {
    const { address } = z
      .object({ address: z.string().default("") })
      .parse(request.query);
    const row = await findByAddress(ctx, address);
    if (!row) return { kind: "missing" as const, query: address };
    const [detail] = await listSummaries(ctx, [row.tokenId]);
    return { kind: "found" as const, property: detail };
  });

  /**
   * Provisions a HomeFax for a parcel outside the pre-provisioned markets.
   * The agent is not creating history here — the county already holds this
   * record; this pulls it in and seeds it with what public data says.
   */
  app.post("/properties/provision", async (request) => {
    const user = await app.requireUser(request);
    if (user.role !== "agent") {
      throw forbidden("Only an agent can provision a HomeFax from county records");
    }
    const { address } = ProvisionRequestSchema.parse(request.body);

    const existing = await findByAddress(ctx, address);
    if (existing) {
      const [summary] = await listSummaries(ctx, [existing.tokenId]);
      return { property: summary, created: false };
    }

    const parcel = await ctx.parcels.provision(address);
    const [row] = await ctx.db
      .insert(properties)
      .values({
        tokenId: parcel.tokenId,
        addressLine1: parcel.address,
        city: parcel.city,
        state: parcel.state,
        postalCode: parcel.postalCode,
        parcelId: parcel.parcelId,
        propertyType: parcel.propertyType,
        yearBuilt: parcel.yearBuilt,
        bedrooms: String(parcel.bedrooms),
        bathrooms: String(parcel.bathrooms),
        livingSqft: parcel.livingSqft,
        lotSqft: parcel.lotSqft,
        currentEstimatedValue: String(parcel.estimatedValue),
        isProvisioned: true,
      })
      .returning();
    if (!row) throw badRequest("Could not provision that parcel");

    for (const event of parcel.events) {
      await ctx.db.insert(propertyEvents).values({
        publicId: event.id,
        propertyId: row.id,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        title: event.title,
        description: event.description || null,
        verificationLevel: event.verificationLevel,
        visibility: event.visibility,
        metadata: { summary: event.meta },
        eventHash: "pending",
      });
    }

    // Permits are the one part of a brand-new record that is not empty. The
    // jurisdiction issued them, dated them and attested to them, so they land
    // as SOURCE_VERIFIED alongside the assessor's own events — the same
    // standing a contributed record has to be reviewed into.
    //
    // A permit lookup failing must not fail the provisioning: the record is
    // already written, and a portal being down is not a reason to refuse a
    // parcel. The provider falls back on its own, and anything past that is
    // logged and left.
    let permitCount = 0;
    try {
      const permits = await ctx.permits.getPermitHistory({
        parcelId: parcel.parcelId,
        address: parcel.address,
      });
      for (const permit of permits) {
        // The contractor and the declared value are most of what makes a
        // permit worth reading: a third party, on the record, saying who did
        // what and what it was worth. Both go in the summary line the timeline
        // shows, and neither is invented when the jurisdiction omits it.
        const summary = [
          permit.scope,
          permit.contractor,
          permit.valuation ? formatMoney(permit.valuation) : null,
        ]
          .filter(Boolean)
          .join(" · ");

        await ctx.db.insert(propertyEvents).values({
          publicId: `${parcel.tokenId}-PERMIT-${permit.permitNumber}`,
          propertyId: row.id,
          eventType:
            permit.status === "FINALED" ? "PERMIT_FINALIZED" : "PERMIT_ISSUED",
          occurredAt: permit.issuedAt,
          title:
            permit.status === "FINALED"
              ? `Permit finaled · ${permit.scope}`
              : `Permit issued · ${permit.scope}`,
          description:
            permit.status === "FINALED" && permit.finaledAt
              ? `Permit ${permit.permitNumber}, issued ${permit.issuedAt} and finaled ${permit.finaledAt} by the jurisdiction.`
              : `Permit ${permit.permitNumber}, issued by the jurisdiction. No completion has been recorded against it.`,
          verificationLevel: "SOURCE_VERIFIED",
          visibility: "PUBLIC",
          metadata: { summary: summary || `Permit ${permit.permitNumber}` },
          eventHash: "pending",
        });
        permitCount += 1;
      }
    } catch (error) {
      request.log.warn({ err: error }, "permit history unavailable while provisioning");
    }

    // Every system starts UNKNOWN, which is the truthful state and lands the
    // record at low Home Health confidence rather than a flattering default.
    const systemDefs: [string, string][] = [
      ["roof", "Roof"],
      ["hvac", "HVAC"],
      ["waterHeater", "Water Heater"],
      ["electrical", "Electrical"],
      ["plumbing", "Plumbing"],
      ["foundation", "Foundation"],
      ["other", "Other"],
    ];
    for (const [key, name] of systemDefs) {
      await ctx.db.insert(propertySystems).values({
        propertyId: row.id,
        systemType: key,
        displayName: name,
        status: "UNKNOWN",
        verificationLevel: "UNVERIFIED",
        rows: [
          ["Status source", "No record yet"],
          ["Last updated", "—"],
        ],
        hidden: key === "other",
      });
    }

    await ctx.db.insert(ownershipPeriods).values({
      propertyId: row.id,
      sequenceNumber: 1,
      label: "Current ownership period",
      rangeLabel: "County record · start date unavailable",
      isCurrent: true,
      verificationLevel: "SOURCE_VERIFIED",
    });

    await ctx.db.transaction(async (tx) => {
      await recomputeChain(tx, row.id);
    });
    await refreshHealthScore(ctx, row.id);

    const [summary] = await listSummaries(ctx, [row.tokenId]);
    return { property: summary, created: true, permitsImported: permitCount };
  });

  app.get("/properties/:tokenId", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const property = await findPropertyRow(ctx, tokenId);
    const detail = await getPropertyDetail(ctx, tokenId, viewerOf(request.user));

    const [claimRow, homeClaimRow, state, contribute, saved] = await Promise.all([
      findAgentClaim(ctx, property.id),
      request.user?.role === "homeowner"
        ? findHomeClaim(ctx, property.id, request.user.id)
        : Promise.resolve(null),
      claimStateFor(ctx, property, request.user),
      contributeState(ctx, property, request.user),
      request.user
        ? ctx.db
            .select()
            .from(savedProperties)
            .where(
              and(
                eq(savedProperties.profileId, request.user.id),
                eq(savedProperties.propertyId, property.id),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
    ]);

    return {
      property: detail,
      claim: claimRow ? toClaim(claimRow, tokenId) : null,
      homeClaim: homeClaimRow ? toHomeClaim(homeClaimRow, tokenId) : null,
      claimState: state,
      contribute,
      saved: saved.length > 0,
      seededStats: await seededRecordStats(ctx, property),
    };
  });

  app.get("/properties/:tokenId/ledger/verify", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const property = await findPropertyRow(ctx, tokenId);
    return { ledger: await verifyPropertyLedger(ctx, property.id) };
  });

  app.get("/properties/:tokenId/documents/:documentId", async (request) => {
    const { tokenId, documentId } = TokenParams.extend({
      documentId: z.uuid(),
    }).parse(request.params);
    const property = await findPropertyRow(ctx, tokenId);
    return readDocumentBody(ctx, property, documentId, viewerOf(request.user));
  });

  app.post("/properties/:tokenId/events", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const user = await app.requireUser(request);
    const property = await findPropertyRow(ctx, tokenId);
    await requireContribute(ctx, property, user);

    const input = AppendEventRequestSchema.parse(request.body);

    // An event is never marked verified because a model produced it. The
    // reviewer picks the level, and AI_EXTRACTED_PENDING is not an approved
    // resting state — approving means a person vouched for the values.
    if (input.verificationLevel === "AI_EXTRACTED_PENDING") {
      throw badRequest(
        "Choose a verification level. An approved record cannot stay marked as pending AI extraction.",
      );
    }

    const result = await appendEvent(
      ctx,
      property,
      {
        ...input,
        attribution: `Added by ${user.displayName} · ${user.roleLabel}`,
      },
      user.id,
    );
    if (input.documentId) await markApproved(ctx, input.documentId);

    return {
      eventId: result.publicId,
      ledger: await verifyPropertyLedger(ctx, property.id),
    };
  });

  app.post("/properties/:tokenId/extractions", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const user = await app.requireUser(request);
    const property = await findPropertyRow(ctx, tokenId);
    await requireContribute(ctx, property, user);
    const input = ExtractionRequestSchema.parse(request.body);
    return extract(ctx, property, input, user.id);
  });

  app.post("/properties/:tokenId/ask", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const user = await app.requireUser(request);
    const property = await findPropertyRow(ctx, tokenId);
    await requireContribute(ctx, property, user);

    // Validate before checking the quota, so a malformed request reports what
    // is wrong with it rather than being reported as an upgrade prompt.
    const { question } = AskRequestSchema.parse(request.body);

    const quota = askQuota(user.plan as Parameters<typeof askQuota>[0]);
    const used = askUsed(user);
    if (quota !== null && used >= quota) {
      throw paymentRequired(PAYWALLS.ask.title, PAYWALLS.ask);
    }

    const detail = await getPropertyDetail(ctx, tokenId, viewerOf(user));
    const answer = await answerQuestion(
      { apiKey: ctx.env.ANTHROPIC_API_KEY, model: ctx.env.ANTHROPIC_MODEL },
      detail,
      question,
    );
    const nextUsed = await consumeAskQuestion(ctx, user);

    return { ...answer, questionsUsed: nextUsed, questionsAllowed: quota };
  });

  app.post("/properties/:tokenId/transfers", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const user = await app.requireUser(request);
    if (user.role !== "agent") {
      throw forbidden("Only the steward can transfer a HomeFax to the owner");
    }
    const property = await findPropertyRow(ctx, tokenId);
    await requireContribute(ctx, property, user);
    const input = TransferRequestSchema.parse(request.body);
    return { result: await transferToOwner(ctx, property, user, input) };
  });

  app.get("/properties/:tokenId/export", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const user = await app.requireUser(request);
    const property = await findPropertyRow(ctx, tokenId);
    await requireContribute(ctx, property, user);

    // Export is gated behind Agent Pro. Contractors are on their own paid
    // tier and never reach this route; homeowners upgrade through Plus.
    if (user.plan === "free") {
      throw paymentRequired(PAYWALLS.export.title, PAYWALLS.export);
    }

    const detail = await getPropertyDetail(ctx, tokenId, viewerOf(user));
    return {
      generatedAt: today(),
      property: detail,
      attestation: {
        ledgerValid: detail.ledger.valid,
        eventsChecked: detail.ledger.checkedEvents,
        note: "The hash chain was intact at the time this report was generated.",
      },
    };
  });

  app.post("/properties/:tokenId/claim", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const user = await app.requireUser(request);
    const property = await findPropertyRow(ctx, tokenId);
    const input = AgentClaimRequestSchema.parse(request.body);
    return { result: await submitAgentClaim(ctx, property, user, input) };
  });

  app.post("/properties/:tokenId/verify-ownership", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const user = await app.requireUser(request);
    const property = await findPropertyRow(ctx, tokenId);
    const input = OwnerClaimRequestSchema.parse(request.body);
    return { result: await submitOwnerClaim(ctx, property, user, input) };
  });

  app.post("/properties/:tokenId/release", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const user = await app.requireUser(request);
    const property = await findPropertyRow(ctx, tokenId);
    await releaseClaim(ctx, property, user);
    return { ok: true };
  });

  /** Saving is a bookmark. It claims nothing and notifies nobody. */
  app.post("/properties/:tokenId/save", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const user = await app.requireUser(request);
    if (user.role !== "agent") {
      throw forbidden("Saved properties are an agent feature");
    }
    const property = await findPropertyRow(ctx, tokenId);
    const existing = await ctx.db
      .select()
      .from(savedProperties)
      .where(
        and(
          eq(savedProperties.profileId, user.id),
          eq(savedProperties.propertyId, property.id),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await ctx.db
        .delete(savedProperties)
        .where(eq(savedProperties.id, existing[0]!.id));
      return { saved: false };
    }
    await ctx.db
      .insert(savedProperties)
      .values({ profileId: user.id, propertyId: property.id });
    return { saved: true };
  });

  app.get("/properties/saved", async (request) => {
    const user = await app.requireUser(request);
    const rows = await ctx.db
      .select({ property: properties })
      .from(savedProperties)
      .innerJoin(properties, eq(savedProperties.propertyId, properties.id))
      .where(eq(savedProperties.profileId, user.id));
    const results: PropertySummary[] = await listSummaries(
      ctx,
      rows.map((r) => r.property.tokenId),
    );
    return { results };
  });

  app.get("/properties/:tokenId/pros-context", async (request) => {
    const { tokenId } = TokenParams.parse(request.params);
    const property = await findPropertyRow(ctx, tokenId);
    return {
      address: property.addressLine1,
      postalCode: property.postalCode,
      value: property.currentEstimatedValue
        ? formatMoney(Number(property.currentEstimatedValue))
        : null,
      asOf: formatDate(today()),
      summary: toSummary(property, 0),
    };
  });
}
