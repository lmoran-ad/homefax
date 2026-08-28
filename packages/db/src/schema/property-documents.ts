import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles.js";
import { properties } from "./properties.js";
import { propertyEvents } from "./property-events.js";

export const propertyDocuments = pgTable(
  "property_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    eventId: uuid("event_id").references(() => propertyEvents.id),
    fileName: text("file_name").notNull(),
    /** Storage key, never an absolute path — that must not reach the browser. */
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: bigint("file_size", { mode: "number" }),
    documentType: text("document_type"),
    visibility: text("visibility").notNull().default("AUTHENTICATED"),
    /** Real SHA-256 of the stored bytes. Content addressing is not stubbed. */
    sha256: text("sha256").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("property_documents_property_idx").on(t.propertyId),
    index("property_documents_event_idx").on(t.eventId),
  ],
);

export type PropertyDocumentRow = typeof propertyDocuments.$inferSelect;
export type NewPropertyDocumentRow = typeof propertyDocuments.$inferInsert;
