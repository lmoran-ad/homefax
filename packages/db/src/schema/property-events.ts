import { sql } from "drizzle-orm";
import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles.js";
import { properties } from "./properties.js";

/**
 * The append-only event store. Nothing in here is ever UPDATEd or DELETEd
 * once committed — a correction is a new row whose `supersedes_event_id`
 * points at what it replaces. `event_hash` and `previous_hash` are recomputed
 * for the whole property whenever an event is appended, because a backdated
 * event re-sorts into history and shifts every hash after it.
 */
export const propertyEvents = pgTable(
  "property_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stable public identifier, e.g. EV-0016. Used in citations and the chain. */
    publicId: text("public_id").notNull(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    occurredAt: date("occurred_at").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    verificationLevel: text("verification_level").notNull(),
    visibility: text("visibility").notNull().default("AUTHENTICATED"),
    sourceType: text("source_type"),
    sourceName: text("source_name"),
    sourceReference: text("source_reference"),
    metadata: jsonb("metadata")
      .notNull()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),
    supersedesEventId: uuid("supersedes_event_id"),
    previousHash: text("previous_hash"),
    eventHash: text("event_hash").notNull(),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("property_events_public_id_key").on(t.publicId),
    index("property_events_property_idx").on(t.propertyId, t.occurredAt),
    index("property_events_type_idx").on(t.eventType),
  ],
);

export type PropertyEventRow = typeof propertyEvents.$inferSelect;
export type NewPropertyEventRow = typeof propertyEvents.$inferInsert;
