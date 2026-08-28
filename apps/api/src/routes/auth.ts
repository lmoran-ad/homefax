import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  SHORT_SESSION_TTL_SECONDS,
  signSession,
} from "@homefax/auth";
import {
  ChangePasswordRequestSchema,
  LoginRequestSchema,
  UpdateProfileRequestSchema,
  type DemoAccount,
  type Role,
} from "@homefax/contracts";
import { fixtureAccounts } from "@homefax/db/fixtures";
import type { FastifyInstance } from "fastify";
import type { AppContext } from "../lib/context.js";
import { unauthorized } from "../lib/errors.js";
import {
  authenticate,
  changePassword,
  toSessionUser,
  updateProfile,
} from "../services/auth-service.js";
import { subscriptionFor } from "../services/billing-service.js";

const demoAccounts: DemoAccount[] = fixtureAccounts.map((a) => ({
  name: a.name,
  initials: a.initials,
  email: a.email,
  role: a.role as Role,
  roleLabel: a.roleLabel,
  avatarBg: a.avatarBg,
  badge: a.badge,
  badgeBg: a.badgeBg,
  badgeFg: a.badgeFg,
  kicker: a.kicker,
  blurb: a.blurb,
}));

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  /**
   * The demo account picker's data. Names and emails only — the shared demo
   * password is never sent to the browser, so the picker fills the email and
   * the person still types or accepts the password field.
   */
  app.get("/auth/demo-accounts", async () => ({ accounts: demoAccounts }));

  app.post("/auth/login", async (request, reply) => {
    const input = LoginRequestSchema.parse(request.body);
    const profile = await authenticate(ctx, input.email, input.password);

    const ttl = input.keepSignedIn ? SESSION_TTL_SECONDS : SHORT_SESSION_TTL_SECONDS;
    const token = signSession(
      { sub: profile.id, role: profile.role as Role, email: profile.email },
      ctx.env.AUTH_JWT_SECRET,
      ttl,
    );

    reply.setCookie(SESSION_COOKIE, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: ctx.env.NODE_ENV === "production",
      maxAge: ttl,
    });

    return { user: toSessionUser(profile) };
  });

  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/auth/me", async (request) => {
    if (!request.user) throw unauthorized();
    return {
      user: toSessionUser(request.user),
      subscription: subscriptionFor(request.user),
    };
  });

  app.patch("/auth/profile", async (request) => {
    const user = await app.requireUser(request);
    const input = UpdateProfileRequestSchema.parse(request.body);
    const updated = await updateProfile(ctx, user, input);
    return { user: toSessionUser(updated) };
  });

  app.post("/auth/password", async (request) => {
    const user = await app.requireUser(request);
    const input = ChangePasswordRequestSchema.parse(request.body);
    await changePassword(ctx, user, input);
    return { ok: true };
  });
}
