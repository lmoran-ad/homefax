import type { FastifyInstance } from "fastify";
import type { AppContext } from "../lib/context";
import { registerAdminRoutes } from "./admin";
import { registerAuthRoutes } from "./auth";
import { registerBillingRoutes } from "./billing";
import { registerDashboardRoutes } from "./dashboard";
import { registerMarketplaceRoutes } from "./marketplace";
import { registerPropertyRoutes } from "./properties";

export function registerRoutes(app: FastifyInstance, ctx: AppContext): void {
  registerAuthRoutes(app, ctx);
  registerDashboardRoutes(app, ctx);
  registerPropertyRoutes(app, ctx);
  registerMarketplaceRoutes(app, ctx);
  registerBillingRoutes(app, ctx);
  registerAdminRoutes(app, ctx);
}
