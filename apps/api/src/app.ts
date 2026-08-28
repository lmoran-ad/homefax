import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { createContext, type AppContext } from "./lib/context";
import { badRequest } from "./lib/errors";
import { authPlugin } from "./plugins/auth";
import { errorHandlerPlugin } from "./plugins/error-handler";
import { readOnlyPlugin } from "./plugins/read-only";
import { registerRoutes } from "./routes/index";

export async function buildApp(
  ctx: AppContext = createContext(),
): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      ctx.env.NODE_ENV === "test"
        ? false
        : { level: ctx.env.NODE_ENV === "production" ? "info" : "debug" },
  });

  await app.register(cors, {
    // The browser sends the session cookie, so the origin must be an explicit
    // allow-list rather than a wildcard.
    origin: [ctx.env.WEB_ORIGIN],
    credentials: true,
  });
  await app.register(cookie, { secret: ctx.env.AUTH_JWT_SECRET });

  // Fastify's built-in JSON parser rejects a request that declares JSON and
  // carries nothing. A browser sends exactly that shape for the bodiless POSTs
  // this API is full of — accept a job, sign out — so an empty body is treated
  // as no body and the route's own schema decides whether that is allowed.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      const text = String(body);
      if (text.trim() === "") {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(text));
      } catch {
        done(badRequest("That request body was not valid JSON"), undefined);
      }
    },
  );

  await app.register(errorHandlerPlugin);
  await app.register(authPlugin, { ctx });
  await app.register(readOnlyPlugin, { ctx });

  app.get("/health", async () => ({
    ok: true,
    demoMode: ctx.env.DEMO_MODE,
    aiConfigured: Boolean(ctx.env.ANTHROPIC_API_KEY),
  }));

  await app.register(async (instance) => registerRoutes(instance, ctx), {
    prefix: "/api",
  });

  return app;
}
