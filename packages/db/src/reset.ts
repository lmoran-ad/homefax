import "./load-env";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "./client";

/**
 * Drops and recreates the public schema. Development only — it is wired to
 * `pnpm db:reset` and refuses to run against NODE_ENV=production.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("db:reset refuses to run with NODE_ENV=production");
  }
  const db = getDb();
  await db.execute(sql`drop schema if exists drizzle cascade`);
  await db.execute(sql`drop schema public cascade`);
  await db.execute(sql`create schema public`);
  console.log("Schema reset.");
  await closeDb();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
