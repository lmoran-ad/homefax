import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { createContext, type AppContext } from "./lib/context.js";
import { authPlugin } from "./plugins/auth.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { registerRoutes } from "./routes/index.js";

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
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin, { ctx });

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
