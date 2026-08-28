import {
  ContractorSearchRequestSchema,
  RequestWorkSchema,
  SubmitWorkSchema,
  UpdateContractorProfileSchema,
} from "@hometoken/contracts";
import { contractorDocumentsForTrade } from "@hometoken/db/fixtures";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../lib/context.js";
import { badRequest, forbidden } from "../lib/errors.js";
import {
  contractorProfile,
  findContractorRow,
  searchContractors,
  toContractor,
  tradeCounts,
  updateContractorProfile,
  verificationChecklist,
} from "../services/contractor-service.js";
import {
  acceptJob,
  acceptSubmission,
  declineSubmission,
  jobStats,
  listJobsForContractor,
  listJobsForHomeowner,
  requestWork,
  submitWork,
} from "../services/job-service.js";
import { findByAddress } from "../services/property-service.js";
import { extract } from "../services/extraction-service.js";
import { profiles } from "@hometoken/db";
import { eq } from "drizzle-orm";

const JobParams = z.object({ jobId: z.string().min(3) });

export function registerMarketplaceRoutes(
  app: FastifyInstance,
  ctx: AppContext,
): void {
  const requireContractor = async (userId: string, contractorId: string | null) => {
    if (!contractorId) {
      throw forbidden("Your account is not linked to a contractor record");
    }
    return findContractorRow(ctx, contractorId);
  };

  app.get("/contractors", async (request) => {
    const input = ContractorSearchRequestSchema.parse(request.query);
    return {
      results: await searchContractors(ctx, input),
      trades: await tradeCounts(ctx),
    };
  });

  app.get("/contractors/:contractorId", async (request) => {
    const { contractorId } = z
      .object({ contractorId: z.string().min(2) })
      .parse(request.params);
    return {
      contractor: await contractorProfile(
        ctx,
        contractorId,
        request.user?.homeTokenId ?? null,
      ),
    };
  });

  app.post("/jobs/requests", async (request) => {
    const user = await app.requireUser(request);
    const input = RequestWorkSchema.parse(request.body);
    return { job: await requestWork(ctx, user, input) };
  });

  app.get("/jobs", async (request) => {
    const user = await app.requireUser(request);

    if (user.role === "homeowner") {
      return { jobs: await listJobsForHomeowner(ctx, user) };
    }
    if (user.role === "contractor") {
      const contractor = await requireContractor(user.id, user.contractorId);
      return {
        jobs: await listJobsForContractor(ctx, contractor),
        stats: await jobStats(ctx, contractor),
        demoDocuments: contractorDocumentsForTrade(contractor.trade).map((d) => ({
          key: d.key,
          title: d.title,
          hint: d.hint,
          name: d.name,
          preview: null,
        })),
      };
    }
    throw forbidden("Jobs are for homeowners and contractors");
  });

  app.post("/jobs/:jobId/accept", async (request) => {
    const { jobId } = JobParams.parse(request.params);
    const user = await app.requireUser(request);
    const contractor = await requireContractor(user.id, user.contractorId);
    return { job: await acceptJob(ctx, contractor, jobId) };
  });

  app.post("/jobs/submit", async (request) => {
    const user = await app.requireUser(request);
    const contractor = await requireContractor(user.id, user.contractorId);
    const input = SubmitWorkSchema.parse(request.body);
    return { job: await submitWork(ctx, contractor, input) };
  });

  /**
   * Live address check for the submission form: green when a HomeToken exists
   * and a homeowner can accept, red when either is missing. Checking before
   * submit is what keeps the refusal a helpful state rather than a dead end
   * after the contractor has filled in the whole form.
   */
  app.get("/jobs/address-check", async (request) => {
    await app.requireUser(request);
    const { address } = z
      .object({ address: z.string().default("") })
      .parse(request.query);

    const property = await findByAddress(ctx, address);
    if (!property) {
      return {
        ok: false,
        message: "No HomeToken found for that address.",
        tokenId: null,
      };
    }
    const [owner] = await ctx.db
      .select()
      .from(profiles)
      .where(eq(profiles.homeTokenId, property.tokenId))
      .limit(1);
    if (!owner) {
      return {
        ok: false,
        message:
          "That HomeToken has no homeowner account, so nobody can accept the record.",
        tokenId: property.tokenId,
      };
    }
    return {
      ok: true,
      message: `HomeToken found · ${property.addressLine1}`,
      tokenId: property.tokenId,
    };
  });

  /** Extraction for a contractor submission, against the target property. */
  app.post("/jobs/extract", async (request) => {
    const user = await app.requireUser(request);
    await requireContractor(user.id, user.contractorId);
    const input = z
      .object({
        address: z.string().min(1),
        demoDocumentKey: z.string().optional(),
        fileName: z.string().optional(),
        text: z.string().optional(),
      })
      .parse(request.body);

    const property = await findByAddress(ctx, input.address);
    if (!property) throw badRequest("No HomeToken found for that address");
    return extract(ctx, property, input, user.id);
  });

  app.post("/jobs/:jobId/accept-submission", async (request) => {
    const { jobId } = JobParams.parse(request.params);
    const user = await app.requireUser(request);
    return acceptSubmission(ctx, user, jobId);
  });

  app.post("/jobs/:jobId/decline-submission", async (request) => {
    const { jobId } = JobParams.parse(request.params);
    const user = await app.requireUser(request);
    return { job: await declineSubmission(ctx, user, jobId) };
  });

  app.get("/verification", async (request) => {
    const user = await app.requireUser(request);
    const contractor = await requireContractor(user.id, user.contractorId);
    return {
      contractor: toContractor(contractor),
      checklist: await verificationChecklist(ctx, contractor),
    };
  });

  app.patch("/verification", async (request) => {
    const user = await app.requireUser(request);
    const contractor = await requireContractor(user.id, user.contractorId);
    const input = UpdateContractorProfileSchema.parse(request.body);
    const updated = await updateContractorProfile(ctx, contractor, input);
    return {
      contractor: toContractor(updated),
      checklist: await verificationChecklist(ctx, updated),
    };
  });
}
