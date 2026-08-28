import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let db: Database | null = null;

export function getPool(connectionString?: string): Pool {
  if (!pool) {
    const url = connectionString ?? process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    pool = new Pool({ connectionString: url, max: 10 });
  }
  return pool;
}

/**
 * The API service is the only runtime that opens this. The web app talks to
 * the API over HTTP and never reaches PostgreSQL directly.
 */
export function getDb(connectionString?: string): Database {
  if (!db) db = drizzle(getPool(connectionString), { schema });
  return db;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export { schema };
