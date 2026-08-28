import { SESSION_COOKIE, verifySession } from "@homefax/auth";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { AppContext } from "../lib/context.js";
import { AppError, unauthorized } from "../lib/errors.js";
import { findProfileById, type SessionUserRecord } from "../services/auth-service.js";

declare module "fastify" {
  interface FastifyRequest {
    /** The signed-in profile, or null for an anonymous caller. */
    user: SessionUserRecord | null;
  }
  interface FastifyInstance {
    /** Loads the session, if any. Never rejects. */
    loadUser: (request: FastifyRequest) => Promise<void>;
    /** Loads the session and rejects an anonymous caller. */
    requireUser: (request: FastifyRequest) => Promise<SessionUserRecord>;
  }
}

async function plugin(app: FastifyInstance, options: { ctx: AppContext }) {
  const { ctx } = options;

  app.decorateRequest("user", null);

  app.decorate("loadUser", async (request: FastifyRequest) => {
    request.user = null;
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return;

    const result = verifySession(token, ctx.env.AUTH_JWT_SECRET);
    if (!result.ok) {
      if (result.reason === "expired") {
        throw new AppError("SESSION_EXPIRED", "Your session has expired");
      }
      return;
    }
    request.user = await findProfileById(ctx, result.claims.sub);
  });

  app.decorate("requireUser", async (request: FastifyRequest) => {
    await app.loadUser(request);
    if (!request.user) throw unauthorized();
    return request.user;
  });

  // Every request gets its session resolved once, so route handlers can read
  // request.user without each remembering to load it. Routes that require a
  // session still call requireUser, which is what actually rejects.
  app.addHook("preHandler", async (request) => {
    await app.loadUser(request);
  });
}

export const authPlugin = fp(plugin, { name: "homefax-auth" });
