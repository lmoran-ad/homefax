import type { Plan, Role, SessionUser } from "@hometoken/contracts";
import { hashPassword, verifyPassword } from "@hometoken/auth";
import { profiles, type ProfileRow } from "@hometoken/db";
import { eq, sql } from "drizzle-orm";
import type { AppContext } from "../lib/context.js";
import { badRequest, unauthorized } from "../lib/errors.js";

export type SessionUserRecord = ProfileRow;

export const PLAN_NAMES: Record<Plan, string> = {
  free: "Free plan",
  homeowner_plus: "Homeowner Plus",
  agent_pro: "Agent Pro",
  verified_source: "Verified Source",
};

export const PLAN_PRICES: Record<Plan, string> = {
  free: "$0",
  homeowner_plus: "$8 / month per property",
  agent_pro: "$39 / month per seat",
  verified_source: "$25 / month per license",
};

export function toSessionUser(row: ProfileRow): SessionUser {
  const plan = row.plan as Plan;
  return {
    id: row.id,
    role: row.role as Role,
    name: row.displayName,
    initials: row.initials,
    email: row.email,
    phone: row.phone,
    roleLabel: row.roleLabel,
    avatarBg: row.avatarBg,
    badge: row.badge,
    plan,
    planName: PLAN_NAMES[plan],
    planPrice: PLAN_PRICES[plan],
    subscriptionCancelled: row.subscriptionCancelled,
    homeTokenId: row.homeTokenId,
    contractorId: row.contractorId,
    landingRoute:
      row.role === "agent"
        ? "/dashboard"
        : row.role === "homeowner"
          ? row.homeTokenId
            ? `/properties/${row.homeTokenId}`
            : "/dashboard"
          : "/jobs",
  };
}

export async function findProfileByEmail(
  ctx: AppContext,
  email: string,
): Promise<ProfileRow | null> {
  const [row] = await ctx.db
    .select()
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

export async function findProfileById(
  ctx: AppContext,
  id: string,
): Promise<ProfileRow | null> {
  const [row] = await ctx.db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  return row ?? null;
}

export async function authenticate(
  ctx: AppContext,
  email: string,
  password: string,
): Promise<ProfileRow> {
  const profile = await findProfileByEmail(ctx, email);

  // Same message and comparable work either way: revealing which of the two
  // was wrong turns the login form into an account-existence oracle.
  if (!profile) {
    await verifyPassword(password, "scrypt$32768$8$1$AAAA$AAAA");
    throw unauthorized("That email and password do not match a demo account");
  }
  const ok = await verifyPassword(password, profile.passwordHash);
  if (!ok) {
    throw unauthorized("That email and password do not match a demo account");
  }
  return profile;
}

export async function updateProfile(
  ctx: AppContext,
  user: SessionUserRecord,
  input: { name: string; email: string; phone: string | null },
): Promise<ProfileRow> {
  const existing = await findProfileByEmail(ctx, input.email);
  if (existing && existing.id !== user.id) {
    throw badRequest("That email address is already in use");
  }
  const [row] = await ctx.db
    .update(profiles)
    .set({
      displayName: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id))
    .returning();
  if (!row) throw badRequest("Could not save your profile");
  return row;
}

export async function changePassword(
  ctx: AppContext,
  user: SessionUserRecord,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) throw badRequest("Your current password is not correct");
  await ctx.db
    .update(profiles)
    .set({
      passwordHash: await hashPassword(input.newPassword),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id));
}
