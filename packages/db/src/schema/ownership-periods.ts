import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { properties } from "./properties.js";

/**
 * Deliberately has no owner-name column. Prior owners are never named in the
 * property record, so the display layer cannot leak what was never stored.
 */
export const ownershipPeriods = pgTable(
  "ownership_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    sequenceNumber: integer("sequence_number").notNull(),
    label: text("label").notNull(),
    /** Pre-rendered human range, e.g. "Oct 11, 2019 – present". */
    rangeLabel: text("range_label").notNull(),
    isCurrent: boolean("is_current").notNull().default(false),
    verificationLevel: text("verification_level").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("ownership_periods_property_seq_key").on(
      t.propertyId,
      t.sequenceNumber,
    ),
  ],
);

export type OwnershipPeriodRow = typeof ownershipPeriods.$inferSelect;
export type NewOwnershipPeriodRow = typeof ownershipPeriods.$inferInsert;
