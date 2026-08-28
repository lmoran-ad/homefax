import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { properties } from "./properties";
import { propertyEvents } from "./property-events";

export const propertySystems = pgTable(
  "property_systems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    systemType: text("system_type").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull(),
    installedAt: date("installed_at"),
    lastServicedAt: date("last_serviced_at"),
    expectedLifeYears: integer("expected_life_years"),
    estimatedRemainingYears: integer("estimated_remaining_years"),
    verificationLevel: text("verification_level").notNull(),
    sourceEventId: uuid("source_event_id").references(() => propertyEvents.id),
    /** Key/value rows rendered on the system card, in display order. */
    rows: jsonb("rows")
      .notNull()
      .$type<[string, string][]>()
      .default(sql`'[]'::jsonb`),
    /** `other` carries weight in the score but is not shown as a card. */
    hidden: boolean("hidden").notNull().default(false),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("property_systems_property_type_key").on(
      t.propertyId,
      t.systemType,
    ),
  ],
);

export type PropertySystemRow = typeof propertySystems.$inferSelect;
export type NewPropertySystemRow = typeof propertySystems.$inferInsert;
