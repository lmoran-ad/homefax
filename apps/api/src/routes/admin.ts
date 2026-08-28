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
import {
  ArcgisParcelProvider,
  ArcgisPermitProvider,
  describeSources,
  SocrataPermitProvider,
  SourceError,
} from "@homefax/providers";
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

  /**
   * What the live data sources are actually returning.
   *
   * A county portal cannot be developed against blind: every jurisdiction
   * names its columns differently, and the only way to learn the real names is
   * to read a real response. This probes each configured source and returns
   * the column list and one sample row, so a wrong mapping is something you
   * can see and correct rather than infer from an empty record.
   *
   * It is public data, queried without credentials, and the same row is
   * visible to anyone with the portal's URL — so returning it here discloses
   * nothing that was not already open. The route is still gated behind
   * DEMO_MODE, because probing outbound endpoints on demand is not something a
   * production deployment should offer to strangers.
   */
  app.get("/admin/sources", async () => {
    if (!ctx.env.DEMO_MODE) {
      throw forbidden("Source diagnostics are available in demo mode only");
    }

    const described = describeSources();

    type Sampler = {
      sample: () => Promise<{
        url: string;
        fields: string[];
        row: Record<string, unknown> | null;
      }>;
      /** Only an ArcGIS source can enumerate itself; Socrata cannot. */
      serviceLayers?: () => Promise<{ id: number; name: string }[]>;
    };

    const probe = async (provider: Sampler | null) => {
      if (!provider) return null;
      const startedAt = Date.now();
      try {
        const { url, fields, row } = await provider.sample();
        return { ok: true as const, latencyMs: Date.now() - startedAt, url, fields, row };
      } catch (error) {
        // Ask the service what it does contain. A wrong layer index, a moved
        // service and a wrong column name all fail identically, and the layer
        // list is what tells them apart — so it is worth one extra request on
        // the path where something is already broken.
        const layers = await provider
          .serviceLayers?.()
          .catch(() => null);
        return {
          ok: false as const,
          latencyMs: Date.now() - startedAt,
          reason: error instanceof Error ? error.message : String(error),
          // The request that failed. Without it, "not found" reads the same
          // whether the layer moved or the query was malformed.
          url: error instanceof SourceError ? error.url : null,
          availableLayers: layers,
        };
      }
    };

    const samplerOf = (provider: unknown): Sampler | null =>
      provider instanceof ArcgisParcelProvider ||
      provider instanceof ArcgisPermitProvider ||
      provider instanceof SocrataPermitProvider
        ? provider
        : null;

    const [parcels, permits] = await Promise.all([
      probe(samplerOf(ctx.parcels)),
      probe(samplerOf(ctx.permits)),
    ]);

    return {
      parcels: { ...described.parcels, probe: parcels },
      permits: { ...described.permits, probe: permits },
    };
  });

  /**
   * Addresses worth demonstrating on.
   *
   * A provisioned record is only as interesting as the history behind it, and
   * most houses have never had a permit pulled — so picking an address from
   * memory usually produces a timeline with two county events on it and proves
   * nothing. This reports where the permit data actually is, along with what
   * each lookup would find, so a demonstration can start from an address that
   * has something to show.
   */
  app.get("/admin/sources/addresses", async () => {
    if (!ctx.env.DEMO_MODE) {
      throw forbidden("Source diagnostics are available in demo mode only");
    }
    if (!(ctx.permits instanceof ArcgisPermitProvider)) {
      return {
        addresses: [],
        note: "No live permit source is configured, so there is nothing to rank.",
      };
    }

    try {
      const addresses = await ctx.permits.busiestAddresses(10);
      return { addresses };
    } catch (error) {
      return {
        addresses: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  /**
   * Says whether this instance can actually serve a page, and if not, why.
   *
   * A deployment that will not load gives you nothing to go on from a browser
   * — every screen renders through the database, so a bad connection string
   * looks exactly like a broken app. This route is the one thing that answers
   * without a database, so it reports the failure instead of throwing it.
   *
   * Nothing secret is returned. The counts and flags say whether a value is
   * present, never what it is; the driver's message names a host and a reason,
   * which is what makes it worth reading, and never a credential.
   */
  app.get("/admin/status", async () => {
    const startedAt = Date.now();
    const database = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties)
      .then((rows) => ({
        reachable: true as const,
        properties: rows[0]?.count ?? 0,
        latencyMs: Date.now() - startedAt,
      }))
      .catch((error: unknown) => {
        // The query layer wraps a connection failure in an error whose message
        // is the SQL it never got to run. The reason lives further down the
        // cause chain, and it is the only part worth reading.
        let root = error;
        while (root instanceof Error && root.cause) root = root.cause;
        return {
          reachable: false as const,
          code: (root as { code?: string }).code ?? null,
          reason: root instanceof Error ? root.message : String(root),
          latencyMs: Date.now() - startedAt,
        };
      });

    return {
      ok: database.reachable,
      seeded: database.reachable && database.properties > 0,
      demoMode: ctx.env.DEMO_MODE,
      storageDriver: ctx.env.STORAGE_DRIVER,
      aiConfigured: Boolean(ctx.env.ANTHROPIC_API_KEY),
      seedRouteEnabled: Boolean(process.env.SEED_SECRET),
      database,
    };
  });
}
