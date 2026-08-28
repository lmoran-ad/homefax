import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    initials: text("initials").notNull(),
    role: text("role").notNull(),
    roleLabel: text("role_label").notNull(),
    avatarBg: text("avatar_bg").notNull(),
    badge: text("badge").notNull(),
    phone: text("phone"),
    brokerage: text("brokerage"),

    // Commerce lives on the profile for the demo. A real build would move this
    // to a subscriptions table with a billing-provider reference.
    plan: text("plan").notNull().default("free"),
    billingCycle: text("billing_cycle").notNull().default("monthly"),
    subscriptionCancelled: boolean("subscription_cancelled")
      .notNull()
      .default(false),
    /** Free-tier Ask This Home questions consumed. */
    askQuestionsUsed: text("ask_questions_used").notNull().default("0"),

    /** Homeowner's property, when the account has one. */
    homeTokenId: text("home_token_id"),
    /** Contractor's company record, when the account has one. */
    contractorId: text("contractor_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("profiles_email_key").on(sql`lower(${t.email})`)],
);

export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
