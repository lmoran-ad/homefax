import type { FastifyInstance } from "fastify";
import type { AppContext } from "../lib/context";
import { forbidden } from "../lib/errors";
import {
  listAgentBook,
  listOwnerHomes,
} from "../services/claim-service";
import { eventCounts, searchProperties, toSummary } from "../services/property-service";
import { jobStats, listJobsForContractor } from "../services/job-service";
import { findContractorRow } from "../services/contractor-service";

export function registerDashboardRoutes(
  app: FastifyInstance,
  ctx: AppContext,
): void {
  /**
   * One call per role, so the dashboard renders in a single round trip rather
   * than a waterfall of six.
   */
  app.get("/dashboard", async (request) => {
    const user = await app.requireUser(request);

    const recent = (await searchProperties(ctx, "")).slice(0, 3);

    if (user.role === "agent") {
      const book = await listAgentBook(ctx, user.id);
      const counts = await eventCounts(ctx, book.map((b) => b.property.id));
      return {
        role: "agent" as const,
        recent,
        book: book.map((b) => ({
          property: toSummary(b.property, counts.get(b.property.id) ?? 0),
          claim: b.claim,
        })),
      };
    }

    if (user.role === "homeowner") {
      const homes = await listOwnerHomes(ctx, user.id);
      const counts = await eventCounts(ctx, homes.map((h) => h.property.id));
      return {
        role: "homeowner" as const,
        recent,
        homes: homes.map((h) => ({
          property: toSummary(h.property, counts.get(h.property.id) ?? 0),
          claim: h.claim,
        })),
      };
    }

    if (!user.contractorId) throw forbidden("Your account has no contractor record");
    const contractor = await findContractorRow(ctx, user.contractorId);
    return {
      role: "contractor" as const,
      recent,
      jobs: await listJobsForContractor(ctx, contractor),
      stats: await jobStats(ctx, contractor),
    };
  });
}
