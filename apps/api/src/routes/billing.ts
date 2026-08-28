import { UpgradeRequestSchema } from "@homefax/contracts";
import { addRecordDemoDocuments } from "@homefax/db/fixtures";
import type { FastifyInstance } from "fastify";
import type { AppContext } from "../lib/context.js";
import { toSessionUser } from "../services/auth-service.js";
import {
  cancelSubscription,
  PAYWALLS,
  PLAN_CARDS,
  setPlan,
  subscriptionFor,
  UNIT_ECONOMICS,
  UNIT_ECONOMICS_TOTAL,
} from "../services/billing-service.js";

export function registerBillingRoutes(
  app: FastifyInstance,
  ctx: AppContext,
): void {
  /** Public: the landing page renders the same plan cards as the in-app screen. */
  app.get("/plans", async () => ({
    plans: PLAN_CARDS,
    paywalls: PAYWALLS,
    unitEconomics: UNIT_ECONOMICS,
    unitEconomicsTotal: UNIT_ECONOMICS_TOTAL,
  }));

  app.post("/billing/upgrade", async (request) => {
    const user = await app.requireUser(request);
    const input = UpgradeRequestSchema.parse(request.body);
    const updated = await setPlan(ctx, user, input.plan, input.cycle);
    return {
      user: toSessionUser(updated),
      subscription: subscriptionFor(updated),
    };
  });

  app.post("/billing/cancel", async (request) => {
    const user = await app.requireUser(request);
    const updated = await cancelSubscription(ctx, user);
    return {
      user: toSessionUser(updated),
      subscription: subscriptionFor(updated),
    };
  });

  app.get("/billing/subscription", async (request) => {
    const user = await app.requireUser(request);
    return { subscription: subscriptionFor(user) };
  });

  /** Demo documents offered in Add Record. Bodies stay server-side. */
  app.get("/demo-documents", async (request) => {
    await app.requireUser(request);
    return {
      documents: addRecordDemoDocuments.map((d) => ({
        key: d.key,
        title: d.title,
        hint: d.hint,
        name: d.name,
        preview: null,
      })),
    };
  });
}
