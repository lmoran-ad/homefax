import { sql } from "drizzle-orm";
import {
  customType,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * Document bytes, for deployments with no durable filesystem.
 *
 * Only DatabaseStorageProvider touches this. It is deliberately a plain blob
 * store keyed by storage key, so switching to S3 later means dropping the
 * table rather than migrating application logic.
 */
export const documentBlobs = pgTable(
  "document_blobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    bytes: bytea("bytes").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("document_blobs_storage_key_key").on(t.storageKey)],
);

export type DocumentBlobRow = typeof documentBlobs.$inferSelect;
