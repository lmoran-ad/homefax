import type { FastifyInstance } from "fastify";
import type { AppContext } from "../lib/context.js";
import { registerAdminRoutes } from "./admin.js";
import { registerAuthRoutes } from "./auth.js";
import { registerBillingRoutes } from "./billing.js";
import { registerDashboardRoutes } from "./dashboard.js";
import { registerMarketplaceRoutes } from "./marketplace.js";
import { registerPropertyRoutes } from "./properties.js";

export function registerRoutes(app: FastifyInstance, ctx: AppContext): void {
  registerAuthRoutes(app, ctx);
  registerDashboardRoutes(app, ctx);
  registerPropertyRoutes(app, ctx);
  registerMarketplaceRoutes(app, ctx);
  registerBillingRoutes(app, ctx);
  registerAdminRoutes(app, ctx);
}
