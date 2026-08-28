import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { properties } from "./properties";
import { propertyDocuments } from "./property-documents";
import { propertyEvents } from "./property-events";

/**
 * An extraction is a proposal and nothing more. It reaches APPROVED only when
 * a person confirms the values — an event is never marked verified because a
 * model produced it.
 */
export const aiExtractionJobs = pgTable(
  "ai_extraction_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => propertyDocuments.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    extractedJson: jsonb("extracted_json").$type<Record<string, unknown> | null>(),
    model: text("model"),
    errorMessage: text("error_message"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [index("ai_extraction_jobs_property_idx").on(t.propertyId)],
);

/**
 * Stewardship transfer. Administration of the digital record moves; legal
 * ownership stays governed by the deed and title process. Nothing here
 * records or implies a deed transfer.
 */
export const tokenTransfers = pgTable(
  "token_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    fromStewardLabel: text("from_steward_label"),
    toStewardLabel: text("to_steward_label").notNull(),
    toStewardEmail: text("to_steward_email").notNull(),
    status: text("status").notNull(),
    initiatedBy: uuid("initiated_by").references(() => profiles.id),
    initiatedAt: timestamp("initiated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    transferEventId: uuid("transfer_event_id").references(
      () => propertyEvents.id,
    ),
  },
  (t) => [index("token_transfers_property_idx").on(t.propertyId)],
);

export type AiExtractionJobRow = typeof aiExtractionJobs.$inferSelect;
export type NewAiExtractionJobRow = typeof aiExtractionJobs.$inferInsert;
export type TokenTransferRow = typeof tokenTransfers.$inferSelect;
export type NewTokenTransferRow = typeof tokenTransfers.$inferInsert;
