import { sql } from "drizzle-orm";
import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./profiles.js";
import { properties } from "./properties.js";

/**
 * Agent stewardship. Time-boxed and non-exclusive by design: a claim expires
 * with the listing, does not lock other agents out of the parcel, and never
 * grants edit rights over existing events — only the right to append and
 * export. Without that constraint the first brokerage to claim a market's
 * parcels would hold the record hostage.
 */
export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    agentName: text("agent_name").notNull(),
    status: text("status").notNull(),
    method: text("method").notNull(),
    mlsNumber: text("mls_number"),
    escrowNumber: text("escrow_number"),
    claimedAt: date("claimed_at").notNull(),
    expiresAt: date("expires_at"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("claims_property_idx").on(t.propertyId),
    index("claims_agent_idx").on(t.agentId),
  ],
);

/** Homeowner verification of their own property. */
export const homeClaims = pgTable(
  "home_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    method: text("method").notNull(),
    verifiedAt: date("verified_at"),
    requestedAt: date("requested_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("home_claims_property_owner_key").on(t.propertyId, t.ownerId),
  ],
);

/** Agent bookmarks. A save claims nothing and notifies no one. */
export const savedProperties = pgTable(
  "saved_properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("saved_properties_profile_property_key").on(
      t.profileId,
      t.propertyId,
    ),
  ],
);

export type ClaimRow = typeof claims.$inferSelect;
export type NewClaimRow = typeof claims.$inferInsert;
export type HomeClaimRow = typeof homeClaims.$inferSelect;
export type NewHomeClaimRow = typeof homeClaims.$inferInsert;
export type SavedPropertyRow = typeof savedProperties.$inferSelect;
