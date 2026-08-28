import "../src/load-env.js";
import { eq } from "drizzle-orm";
import { calculateHealthScore } from "@homefax/contracts";
import type { SystemKey, SystemStatus } from "@homefax/contracts";
import { verifyLedger } from "@homefax/ledger";
import {
  closeDb,
  getDb,
  properties,
  propertyDocuments,
  propertyEvents,
  propertySystems,
} from "../src/index";

/**
 * Sanity check on a freshly seeded database: every ledger must validate, and
 * the cached health score must equal a fresh calculation. Wired to
 * `pnpm --filter @homefax/db verify` and run in CI after seeding.
 */
async function main(): Promise<void> {
  const db = getDb();
  const props = await db.select().from(properties);
  let invalid = 0;
  let mismatched = 0;

  for (const p of props) {
    const events = await db
      .select()
      .from(propertyEvents)
      .where(eq(propertyEvents.propertyId, p.id));
    const result = verifyLedger(
      events.map((e) => ({
        id: e.publicId,
        eventType: e.eventType,
        occurredAt: e.occurredAt,
        title: e.title,
        description: e.description,
        verificationLevel: e.verificationLevel,
        visibility: e.visibility,
        metadata: e.metadata,
        eventHash: e.eventHash,
        previousHash: e.previousHash,
      })),
    );

    const systems = await db
      .select()
      .from(propertySystems)
      .where(eq(propertySystems.propertyId, p.id));
    const health = calculateHealthScore(
      systems.map((s) => ({
        key: s.systemType as SystemKey,
        status: s.status as SystemStatus,
      })),
    );

    const docs = await db
      .select()
      .from(propertyDocuments)
      .where(eq(propertyDocuments.propertyId, p.id));

    if (!result.valid) invalid += 1;
    if (health.score !== p.currentHealthScore) mismatched += 1;

    console.log(
      `${p.tokenId}  ledger=${result.valid ? "VALID  " : "INVALID"}  ` +
        `events=${String(result.checkedEvents).padStart(3)}  ` +
        `docs=${String(docs.length).padStart(2)}  ` +
        `health=${health.score}/${health.confidence} (cached ${p.currentHealthScore})`,
    );
  }

  console.log("");
  if (invalid || mismatched) {
    console.error(
      `FAILED: ${invalid} invalid ledger(s), ${mismatched} health mismatch(es).`,
    );
    await closeDb();
    process.exit(1);
  }
  console.log(`All ${props.length} ledgers valid; all health scores match.`);
  await closeDb();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
