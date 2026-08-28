import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenId: text("token_id").notNull(),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    countryCode: text("country_code").notNull().default("US"),
    parcelId: text("parcel_id").notNull(),
    latitude: numeric("latitude"),
    longitude: numeric("longitude"),
    yearBuilt: integer("year_built"),
    bedrooms: numeric("bedrooms"),
    bathrooms: numeric("bathrooms"),
    livingSqft: integer("living_sqft"),
    lotSqft: integer("lot_sqft"),
    propertyType: text("property_type"),
    currentEstimatedValue: numeric("current_estimated_value"),
    /** Cached from the deterministic scorer; recomputed whenever systems change. */
    currentHealthScore: integer("current_health_score"),

    isShowcase: boolean("is_showcase").notNull().default(false),
    /** Created from county records via ParcelProvider.provision, not seeded. */
    isProvisioned: boolean("is_provisioned").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("properties_token_id_key").on(t.tokenId),
    index("properties_parcel_id_idx").on(t.parcelId),
    index("properties_address_idx").on(sql`lower(${t.addressLine1})`),
    index("properties_city_idx").on(sql`lower(${t.city})`),
  ],
);

export type PropertyRow = typeof properties.$inferSelect;
export type NewPropertyRow = typeof properties.$inferInsert;
