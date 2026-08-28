import type {
  Job,
  JobSubmission,
  RequestWork,
  SubmitWork,
} from "@homefax/contracts";
import {
  contractors,
  jobs,
  profiles,
  properties,
  propertyDocuments,
  type ContractorRow,
  type JobRow,
  type PropertyRow,
} from "@homefax/db";
import { desc, eq, sql } from "drizzle-orm";
import type { AppContext } from "../lib/context.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { today } from "../lib/format.js";
import type { SessionUserRecord } from "./auth-service.js";
import { appendEvent } from "./event-service.js";
import { findByAddress } from "./property-service.js";
import { markApproved } from "./extraction-service.js";

function toJob(row: JobRow, property: PropertyRow, contractor: ContractorRow): Job {
  return {
    id: row.publicId,
    status: row.status as Job["status"],
    contractorId: contractor.publicId,
    contractorName: contractor.name,
    trade: row.trade,
    description: row.description,
    shareSystemRecord: row.shareSystemRecord,
    tokenId: property.tokenId,
    address: property.addressLine1,
    requestedAt: row.requestedAt,
    submission: (row.submission as JobSubmission | null) ?? null,
    eventId: null,
  };
}

async function loadJoined(ctx: AppContext, where: ReturnType<typeof eq>) {
  return ctx.db
    .select({ job: jobs, property: properties, contractor: contractors })
    .from(jobs)
    .innerJoin(properties, eq(jobs.propertyId, properties.id))
    .innerJoin(contractors, eq(jobs.contractorId, contractors.id))
    .where(where)
    .orderBy(desc(jobs.createdAt));
}

export async function listJobsForHomeowner(
  ctx: AppContext,
  user: SessionUserRecord,
): Promise<Job[]> {
  const rows = await loadJoined(ctx, eq(jobs.requestedById, user.id));
  return rows.map((r) => toJob(r.job, r.property, r.contractor));
}

export async function listJobsForContractor(
  ctx: AppContext,
  contractor: ContractorRow,
): Promise<Job[]> {
  const rows = await loadJoined(ctx, eq(jobs.contractorId, contractor.id));
  return rows.map((r) => toJob(r.job, r.property, r.contractor));
}

export async function findJob(
  ctx: AppContext,
  publicId: string,
): Promise<{ job: JobRow; property: PropertyRow; contractor: ContractorRow }> {
  const [row] = await loadJoined(ctx, eq(jobs.publicId, publicId));
  if (!row) throw notFound("No job found with that id");
  return { job: row.job, property: row.property, contractor: row.contractor };
}

const publicJobId = (): string =>
  `JOB-${Date.now().toString(36).slice(-5).toUpperCase()}`;

export async function requestWork(
  ctx: AppContext,
  user: SessionUserRecord,
  input: RequestWork,
): Promise<Job> {
  if (user.role !== "homeowner") {
    throw forbidden("Only a homeowner can request work at their property");
  }
  if (!user.ownedTokenId) {
    throw badRequest("Verify ownership of a home before requesting work");
  }

  const [property] = await ctx.db
    .select()
    .from(properties)
    .where(eq(properties.tokenId, user.ownedTokenId))
    .limit(1);
  if (!property) throw notFound("Your home record could not be found");

  const [contractor] = await ctx.db
    .select()
    .from(contractors)
    .where(eq(contractors.publicId, input.contractorId))
    .limit(1);
  if (!contractor) throw notFound("No contractor found with that id");

  const [row] = await ctx.db
    .insert(jobs)
    .values({
      publicId: publicJobId(),
      propertyId: property.id,
      contractorId: contractor.id,
      requestedById: user.id,
      status: "requested",
      trade: input.trade,
      description: input.description.trim(),
      shareSystemRecord: input.shareSystemRecord,
      requestedAt: today(),
    })
    .returning();
  if (!row) throw badRequest("Could not send the request");
  return toJob(row, property, contractor);
}

export async function acceptJob(
  ctx: AppContext,
  contractor: ContractorRow,
  publicId: string,
): Promise<Job> {
  const { job, property, contractor: owner } = await findJob(ctx, publicId);
  if (owner.id !== contractor.id) {
    throw forbidden("That job was not sent to your company");
  }
  if (job.status !== "requested") {
    throw badRequest("That job has already been accepted");
  }
  const [row] = await ctx.db
    .update(jobs)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(jobs.id, job.id))
    .returning();
  return toJob(row ?? job, property, owner);
}

/**
 * The contractor submits a proposed record.
 *
 * Two refusals here are deliberate and should not be relaxed: an address with
 * no HomeFax cannot receive a submission, and neither can one with no
 * homeowner account — because there would be nobody to accept or decline it,
 * and an unreviewed submission would amount to a contractor writing directly
 * into someone's property record.
 */
export async function submitWork(
  ctx: AppContext,
  contractor: ContractorRow,
  input: SubmitWork,
): Promise<Job> {
  const property = await findByAddress(ctx, input.address);
  if (!property) {
    throw badRequest(
      "No HomeFax found for that address. Only seeded demo properties can receive a submission.",
    );
  }

  const [owner] = await ctx.db
    .select()
    .from(profiles)
    .where(eq(profiles.ownedTokenId, property.tokenId))
    .limit(1);
  if (!owner) {
    throw badRequest(
      "That address has no homeowner account, so there is nobody to accept the record. In this demo only 123 Main Street has one.",
    );
  }

  const submission: JobSubmission = {
    title: input.title.trim(),
    occurredAt: input.occurredAt,
    amount: input.amount,
    eventType: input.eventType,
    systemType: input.systemType,
    description: input.description,
    documentId: input.documentId,
    documentName: null,
    contractorId: contractor.publicId,
    contractorName: contractor.name,
    license: contractor.licenseNumber,
    verified: contractor.verified,
  };

  if (input.documentId) {
    const [document] = await ctx.db
      .select()
      .from(propertyDocuments)
      .where(eq(propertyDocuments.id, input.documentId))
      .limit(1);
    submission.documentName = document?.fileName ?? null;
  }

  if (input.jobId) {
    const { job, contractor: owner_ } = await findJob(ctx, input.jobId);
    if (owner_.id !== contractor.id) {
      throw forbidden("That job was not sent to your company");
    }
    const [row] = await ctx.db
      .update(jobs)
      .set({
        status: "submitted",
        submission: submission as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id))
      .returning();
    return toJob(row ?? job, property, contractor);
  }

  const [row] = await ctx.db
    .insert(jobs)
    .values({
      publicId: publicJobId(),
      propertyId: property.id,
      contractorId: contractor.id,
      requestedById: owner.id,
      status: "submitted",
      trade: input.systemType || contractor.trade,
      description: "Submitted directly by the contractor without a prior request.",
      shareSystemRecord: false,
      requestedAt: today(),
      submission: submission as unknown as Record<string, unknown>,
    })
    .returning();
  if (!row) throw badRequest("Could not send the submission");
  return toJob(row, property, contractor);
}

/**
 * The homeowner accepts a submission, and only then does it become an event.
 *
 * The verification level is derived from the contractor's licence state at
 * acceptance, not from anything the contractor asserted: an unverified company
 * lands as OWNER_REPORTED rather than PROFESSIONAL_VERIFIED. Paying for a
 * subscription does not confer verification either — the licence does.
 */
export async function acceptSubmission(
  ctx: AppContext,
  user: SessionUserRecord,
  publicId: string,
): Promise<{ job: Job; eventId: string }> {
  const { job, property, contractor } = await findJob(ctx, publicId);
  if (job.requestedById !== user.id) {
    throw forbidden("That job is not on one of your homes");
  }
  if (job.status !== "submitted") {
    throw badRequest("That job has no submission awaiting your acceptance");
  }
  const submission = job.submission as JobSubmission | null;
  if (!submission) throw badRequest("That job has no submission to accept");

  const license = await ctx.licenses.verify({
    licenseNumber: submission.license,
    trade: job.trade,
  });
  const verificationLevel = license.verified
    ? ("PROFESSIONAL_VERIFIED" as const)
    : ("OWNER_REPORTED" as const);

  const description = [
    submission.description,
    `Submitted by ${submission.contractorName} as a ${
      license.verified ? "Verified Source" : "contractor whose license is not on file"
    } and accepted by the homeowner.`,
  ]
    .filter(Boolean)
    .join(" ");

  const { publicId: eventPublicId } = await appendEvent(
    ctx,
    property,
    {
      title: submission.title,
      eventType: submission.eventType,
      occurredAt: submission.occurredAt,
      description,
      contractor: submission.contractorName,
      amount: submission.amount,
      permitNumber: null,
      systemType: submission.systemType,
      verificationLevel,
      visibility: "AUTHENTICATED",
      materials: [],
      documentId: submission.documentId,
      attribution: submission.contractorName,
      contractorLicense: submission.license,
    },
    user.id,
  );

  if (submission.documentId) await markApproved(ctx, submission.documentId);

  await ctx.db
    .update(jobs)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(jobs.id, job.id));

  await ctx.db
    .update(contractors)
    .set({ jobCount: contractor.jobCount + 1, updatedAt: new Date() })
    .where(eq(contractors.id, contractor.id));

  const updated = await findJob(ctx, publicId);
  return {
    job: { ...toJob(updated.job, property, contractor), eventId: eventPublicId },
    eventId: eventPublicId,
  };
}

/** Declining changes nothing on the record. No event, no trace on the property. */
export async function declineSubmission(
  ctx: AppContext,
  user: SessionUserRecord,
  publicId: string,
): Promise<Job> {
  const { job, property, contractor } = await findJob(ctx, publicId);
  if (job.requestedById !== user.id) {
    throw forbidden("That job is not on one of your homes");
  }
  const [row] = await ctx.db
    .update(jobs)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(jobs.id, job.id))
    .returning();
  return toJob(row ?? job, property, contractor);
}

export async function jobStats(
  ctx: AppContext,
  contractor: ContractorRow,
): Promise<{ open: number; inProgress: number; awaiting: number; recorded: number }> {
  const rows = await ctx.db
    .select({ status: jobs.status, count: sql<number>`count(*)::int` })
    .from(jobs)
    .where(eq(jobs.contractorId, contractor.id))
    .groupBy(jobs.status);
  const by = new Map(rows.map((r) => [r.status, r.count]));
  return {
    open: by.get("requested") ?? 0,
    inProgress: by.get("accepted") ?? 0,
    awaiting: by.get("submitted") ?? 0,
    recorded: by.get("approved") ?? 0,
  };
}
