import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles.js";
import { properties } from "./properties.js";
import { propertyEvents } from "./property-events.js";

export const contractors = pgTable(
  "contractors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull(),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
    trade: text("trade").notNull(),
    licenseNumber: text("license_number").notNull(),
    /** Set from LicenseProvider.verify, never entered by hand. */
    verified: boolean("verified").notNull().default(false),
    verifiedSince: text("verified_since").notNull(),
    serviceArea: text("service_area").notNull(),
    serviceZips: text("service_zips").notNull(),
    jobCount: integer("job_count").notNull().default(0),
    phone: text("phone").notNull(),
    blurb: text("blurb").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("contractors_public_id_key").on(t.publicId),
    index("contractors_trade_idx").on(sql`lower(${t.trade})`),
  ],
);

/**
 * The contractor loop: homeowner requests work, contractor accepts, contractor
 * submits a proposed record, homeowner accepts or declines. A submission is a
 * proposal — the owner can accept or decline it but cannot alter it, and
 * declining changes nothing on the record.
 */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade" }),
    requestedById: uuid("requested_by_id").references(() => profiles.id),
    status: text("status").notNull(),
    trade: text("trade").notNull(),
    description: text("description").notNull(),
    shareSystemRecord: boolean("share_system_record").notNull().default(false),
    requestedAt: date("requested_at").notNull(),
    /** The proposed record, pending homeowner acceptance. */
    submission: jsonb("submission").$type<Record<string, unknown> | null>(),
    /** Set once the homeowner accepts and the event is appended. */
    resultEventId: uuid("result_event_id").references(() => propertyEvents.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("jobs_public_id_key").on(t.publicId),
    index("jobs_property_idx").on(t.propertyId),
    index("jobs_contractor_idx").on(t.contractorId),
  ],
);

export type ContractorRow = typeof contractors.$inferSelect;
export type NewContractorRow = typeof contractors.$inferInsert;
export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
