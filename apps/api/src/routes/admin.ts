import { hashPassword } from "@homefax/auth";
import { calculateHealthScore } from "@homefax/contracts";
import {
  claims,
  contractors,
  homeClaims,
  ownershipPeriods,
  profiles,
  properties,
  propertyDocuments,
  propertyEvents,
  propertySystems,
  savedProperties,
} from "@homefax/db";
import {
  fixtureAccounts,
  fixtureContractors,
  fixtureProperties,
  SHOWCASE_TOKEN_ID,
} from "@homefax/fixtures";
import { buildChain, type ChainableEvent } from "@homefax/ledger";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { timingSafeEqual } from "node:crypto";
import type { AppContext } from "../lib/context";
import { AppError, forbidden } from "../lib/errors";

/**
 * Loads the demo dataset into whatever database this instance is pointed at.
 *
 * This exists because a hosted deployment has no shell to run `pnpm db:seed`
 * from — the fixtures ship in the bundle, so the app can seed itself once.
 *
 * It is destructive: it truncates the demo tables before writing. Three things
 * keep that from being a foot-gun:
 *
 *   - it 404s unless SEED_SECRET is configured, so it does not exist at all in
 *     an environment that has not opted in;
 *   - the secret is compared in constant time;
 *   - it refuses to run unless DEMO_MODE is on.
 *
 * None of that makes it safe for a database holding real records. It is for
 * seeding a demo, and it should be removed before this carries anything real.
 */
export function registerAdminRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/admin/seed", async (request) => {
    const configured = process.env.SEED_SECRET;
    if (!configured) {
      throw new AppError("NOT_FOUND", "No route for POST /api/admin/seed");
    }
    if (!ctx.env.DEMO_MODE) {
      throw forbidden("Seeding is disabled outside demo mode");
    }

    const supplied = String(
      (request.headers["x-seed-secret"] as string | undefined) ?? "",
    );
    const a = Buffer.from(supplied);
    const b = Buffer.from(configured);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw forbidden("Invalid seed secret");
    }

    const db = ctx.db;

    await db.execute(sql`
      truncate table
        "ai_extraction_jobs","token_transfers","jobs","saved_properties",
        "home_claims","claims","ownership_periods","property_systems",
        "property_documents","property_events","properties","contractors",
        "profiles","document_blobs"
      restart identity cascade
    `);

    const profileIds = new Map<string, string>();
    for (const account of fixtureAccounts) {
      const [row] = await db
        .insert(profiles)
        .values({
          email: account.email,
          passwordHash: await hashPassword(account.password),
          displayName: account.name,
          initials: account.initials,
          role: account.role,
          roleLabel: account.roleLabel,
          avatarBg: account.avatarBg,
          badge: account.badge,
          phone: account.phone,
          brokerage: account.brokerage,
          plan: account.role === "contractor" ? "verified_source" : "free",
          ownedTokenId: account.ownedTokenId,
          contractorId: account.contractorId,
        })
        .returning();
      profileIds.set(account.email, row!.id);
    }

    for (const contractor of fixtureContractors) {
      await db.insert(contractors).values({
        publicId: contractor.id,
        name: contractor.name,
        initials: contractor.initials,
        trade: contractor.trade,
        licenseNumber: contractor.license,
        verified: contractor.verified,
        verifiedSince: contractor.since,
        serviceArea: contractor.area,
        serviceZips: contractor.zips,
        jobCount: contractor.jobCount,
        phone: contractor.phone,
        blurb: contractor.blurb,
      });
    }

    const propertyIds = new Map<string, string>();
    let documentCount = 0;
    let eventCount = 0;

    for (const fixture of fixtureProperties) {
      const health = calculateHealthScore(
        fixture.systems.map((s) => ({ key: s.key, status: s.status })),
      );
      const [property] = await db
        .insert(properties)
        .values({
          tokenId: fixture.tokenId,
          addressLine1: fixture.address,
          city: fixture.city,
          state: fixture.state,
          postalCode: fixture.postalCode,
          parcelId: fixture.parcelId,
          propertyType: fixture.propertyType,
          yearBuilt: fixture.yearBuilt,
          bedrooms: String(fixture.bedrooms),
          bathrooms: String(fixture.bathrooms),
          livingSqft: fixture.livingSqft,
          lotSqft: fixture.lotSqft,
          currentEstimatedValue: String(fixture.estimatedValue),
          currentHealthScore: health.score,
          isShowcase: fixture.isShowcase,
        })
        .returning();
      propertyIds.set(fixture.tokenId, property!.id);

      const chainable: ChainableEvent[] = fixture.events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        occurredAt: e.occurredAt,
        title: e.title,
        description: e.description || null,
        verificationLevel: e.verificationLevel,
        visibility: e.visibility,
        metadata: { summary: e.meta },
      }));
      const links = new Map(buildChain(chainable).map((l) => [l.eventId, l]));
      const eventIds = new Map<string, string>();
      let documentIndex = 0;

      for (const event of fixture.events) {
        const link = links.get(event.id)!;
        const [row] = await db
          .insert(propertyEvents)
          .values({
            publicId: event.id,
            propertyId: property!.id,
            eventType: event.eventType,
            occurredAt: event.occurredAt,
            title: event.title,
            description: event.description || null,
            verificationLevel: event.verificationLevel,
            visibility: event.visibility,
            metadata: { summary: event.meta },
            previousHash: link.previousHash,
            eventHash: link.hash,
          })
          .returning();
        eventIds.set(event.id, row!.id);
        eventCount += 1;

        for (const document of event.documents) {
          documentIndex += 1;
          const safeName = document.name.replace(/[^A-Za-z0-9._-]/g, "_");
          const key = `${fixture.tokenId}/seed-${String(documentIndex).padStart(3, "0")}-${safeName}.txt`;
          // Through the storage provider, so the sha256 is a real hash of the
          // stored bytes exactly as an upload would produce.
          const stored = await ctx.storage.put({
            key,
            bytes: Buffer.from(document.text, "utf8"),
            contentType: "text/plain",
          });
          await db.insert(propertyDocuments).values({
            propertyId: property!.id,
            eventId: row!.id,
            fileName: document.name,
            storagePath: stored.key,
            mimeType: "text/plain",
            fileSize: stored.size,
            documentType: document.kind,
            visibility: document.visibility,
            sha256: stored.sha256,
          });
          documentCount += 1;
        }
      }

      for (const system of fixture.systems) {
        await db.insert(propertySystems).values({
          propertyId: property!.id,
          systemType: system.key,
          displayName: system.name,
          status: system.status,
          verificationLevel: system.verificationLevel,
          sourceEventId: system.sourceEventId
            ? (eventIds.get(system.sourceEventId) ?? null)
            : null,
          rows: system.rows,
          hidden: system.hidden,
        });
      }

      for (const period of fixture.ownership) {
        await db.insert(ownershipPeriods).values({
          propertyId: property!.id,
          sequenceNumber: period.sequenceNumber,
          label: period.label,
          rangeLabel: period.rangeLabel,
          isCurrent: period.isCurrent,
          verificationLevel: period.verificationLevel,
        });
      }
    }

    const agentId = profileIds.get("agent@homefax.demo")!;
    const ownerId = profileIds.get("owner@homefax.demo")!;
    const showcaseId = propertyIds.get(SHOWCASE_TOKEN_ID)!;

    await db.insert(claims).values({
      propertyId: showcaseId,
      agentId,
      agentName: "Alex Morgan",
      status: "active",
      method: "MLS",
      mlsNumber: "9182446",
      claimedAt: "2026-08-14",
      expiresAt: "2026-11-12",
    });
    await db.insert(homeClaims).values({
      propertyId: showcaseId,
      ownerId,
      status: "active",
      method: "County record match",
      verifiedAt: "2026-02-11",
    });
    await db.insert(savedProperties).values({
      profileId: agentId,
      propertyId: propertyIds.get("HF-US-CO-DEN-00004501")!,
    });

    return {
      seeded: true,
      properties: fixtureProperties.length,
      events: eventCount,
      documents: documentCount,
      contractors: fixtureContractors.length,
      accounts: fixtureAccounts.length,
    };
  });

  /** Cheap check that the deployment can reach its database. */
  app.get("/admin/status", async () => {
    const [row] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties);
    return {
      databaseReachable: true,
      properties: row?.count ?? 0,
      seedRouteEnabled: Boolean(process.env.SEED_SECRET),
      storageDriver: ctx.env.STORAGE_DRIVER,
      aiConfigured: Boolean(ctx.env.ANTHROPIC_API_KEY),
    };
  });
}
