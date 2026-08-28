import "../load-env.js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { calculateHealthScore } from "@homefax/contracts";
import { buildChain, sha256, type ChainableEvent } from "@homefax/ledger";
import { hashPassword } from "@homefax/auth";
import { getStorageProvider } from "@homefax/providers";
import { closeDb, getDb, type Database } from "../client.js";
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
} from "../schema/index.js";
import {
  fixtureAccounts,
  fixtureContractors,
  fixtureProperties,
  SEED_TODAY,
  SHOWCASE_TOKEN_ID,
} from "./fixtures/index.js";
import type { FixtureProperty } from "./fixtures/types.js";

const STORAGE_ROOT = (() => {
  const configured = process.env.LOCAL_STORAGE_PATH ?? "./storage/demo-uploads";
  return isAbsolute(configured)
    ? configured
    : resolve(process.cwd(), configured);
})();

/**
 * Writes a seeded document to storage and returns its real SHA-256. The seeder
 * hashes the same way the upload path does — a seeded document and an uploaded
 * one are indistinguishable once stored, which is the point of content
 * addressing.
 */
async function storeDocument(
  tokenId: string,
  index: number,
  fileName: string,
  text: string,
): Promise<{ storagePath: string; sha256: string; size: number }> {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_");
  const storagePath = `${tokenId}/seed-${String(index).padStart(3, "0")}-${safeName}.txt`;
  const bytes = Buffer.from(text, "utf8");

  if (process.env.STORAGE_DRIVER === "database") {
    const stored = await getStorageProvider().put({
      key: storagePath,
      bytes,
      contentType: "text/plain",
    });
    return { storagePath, sha256: stored.sha256, size: stored.size };
  }

  const absolute = resolve(STORAGE_ROOT, storagePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  return { storagePath, sha256: sha256(bytes), size: bytes.byteLength };
}

async function seedProperty(db: Database, fixture: FixtureProperty, agentId: string) {
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
      isProvisioned: false,
    })
    .returning();

  if (!property) throw new Error(`Failed to insert ${fixture.tokenId}`);

  // Hash the whole chain before inserting, so every seeded event lands with
  // the hashes it would have had if it had been appended one at a time.
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

  const eventIdByPublicId = new Map<string, string>();
  let documentIndex = 0;

  for (const event of fixture.events) {
    const link = links.get(event.id);
    if (!link) throw new Error(`No chain link for ${event.id}`);

    const [row] = await db
      .insert(propertyEvents)
      .values({
        publicId: event.id,
        propertyId: property.id,
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
    if (!row) throw new Error(`Failed to insert event ${event.id}`);
    eventIdByPublicId.set(event.id, row.id);

    for (const document of event.documents) {
      documentIndex += 1;
      const stored = await storeDocument(
        fixture.tokenId,
        documentIndex,
        document.name,
        document.text,
      );
      await db.insert(propertyDocuments).values({
        propertyId: property.id,
        eventId: row.id,
        fileName: document.name,
        storagePath: stored.storagePath,
        mimeType: "text/plain",
        fileSize: stored.size,
        documentType: document.kind,
        visibility: document.visibility,
        sha256: stored.sha256,
      });
    }
  }

  for (const system of fixture.systems) {
    await db.insert(propertySystems).values({
      propertyId: property.id,
      systemType: system.key,
      displayName: system.name,
      status: system.status,
      verificationLevel: system.verificationLevel,
      sourceEventId: system.sourceEventId
        ? (eventIdByPublicId.get(system.sourceEventId) ?? null)
        : null,
      rows: system.rows,
      hidden: system.hidden,
    });
  }

  for (const period of fixture.ownership) {
    await db.insert(ownershipPeriods).values({
      propertyId: property.id,
      sequenceNumber: period.sequenceNumber,
      label: period.label,
      rangeLabel: period.rangeLabel,
      isCurrent: period.isCurrent,
      verificationLevel: period.verificationLevel,
    });
  }

  return { property, health, agentId };
}

async function main(): Promise<void> {
  const db = getDb();

  console.log("Seeding accounts…");
  const profileIdByEmail = new Map<string, string>();
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
        // Contractors are on Verified Source from the start; that subscription
        // is what their submissions' Professional Verified status rests on.
        plan: account.role === "contractor" ? "verified_source" : "free",
        ownedTokenId: account.ownedTokenId,
        contractorId: account.contractorId,
      })
      .returning();
    if (!row) throw new Error(`Failed to insert ${account.email}`);
    profileIdByEmail.set(account.email, row.id);
  }

  const agentId = profileIdByEmail.get("agent@homefax.demo")!;
  const ownerId = profileIdByEmail.get("owner@homefax.demo")!;

  console.log("Seeding contractors…");
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

  console.log("Seeding properties…");
  const propertyIdByToken = new Map<string, string>();
  for (const fixture of fixtureProperties) {
    const { property } = await seedProperty(db, fixture, agentId);
    propertyIdByToken.set(fixture.tokenId, property.id);
    console.log(`  ${fixture.tokenId}  ${fixture.address}`);
  }

  console.log("Seeding claims…");
  const showcaseId = propertyIdByToken.get(SHOWCASE_TOKEN_ID)!;

  // The agent starts with an active MLS claim on the showcase property, so the
  // demo opens on a record they can actually contribute to. Everything else is
  // unclaimed, which is what makes the claim flow reachable.
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
    propertyId: propertyIdByToken.get("HF-US-CO-DEN-00004501")!,
  });

  const [{ count: eventCount } = { count: 0 }] = await db
    .select({ count: propertyEvents.id })
    .from(propertyEvents)
    .then((rows) => [{ count: rows.length }]);

  console.log(
    `\nSeeded ${fixtureProperties.length} properties, ${eventCount} events, ` +
      `${fixtureContractors.length} contractors, ${fixtureAccounts.length} accounts.`,
  );
  console.log(`Reference date: ${SEED_TODAY}`);
  await closeDb();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
