import { z } from "zod";
import { EventTypeSchema, JobStatusSchema } from "./enums";
import { IsoDateSchema } from "./property";

export const ContractorSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  trade: z.string(),
  license: z.string(),
  verified: z.boolean(),
  since: z.string(),
  area: z.string(),
  zips: z.string(),
  jobCount: z.number().int(),
  phone: z.string(),
  blurb: z.string(),
});
export type Contractor = z.infer<typeof ContractorSchema>;

/** A row on a contractor profile: work they performed, shown ZIP-only. */
export const ContractorWorkRowSchema = z.object({
  eventId: z.string(),
  tokenId: z.string(),
  postalCode: z.string(),
  occurredAt: IsoDateSchema,
  title: z.string(),
  meta: z.string(),
  onThisHome: z.boolean(),
});
export type ContractorWorkRow = z.infer<typeof ContractorWorkRowSchema>;

export const ContractorProfileSchema = ContractorSchema.extend({
  work: z.array(ContractorWorkRowSchema),
  recordsOnThisHome: z.number().int(),
});
export type ContractorProfile = z.infer<typeof ContractorProfileSchema>;

export const JobSubmissionSchema = z.object({
  title: z.string(),
  occurredAt: IsoDateSchema,
  amount: z.number().nullable(),
  eventType: EventTypeSchema,
  systemType: z.string().nullable(),
  description: z.string(),
  documentId: z.string().nullable(),
  documentName: z.string().nullable(),
  contractorId: z.string(),
  contractorName: z.string(),
  license: z.string(),
  verified: z.boolean(),
});
export type JobSubmission = z.infer<typeof JobSubmissionSchema>;

export const JobSchema = z.object({
  id: z.string(),
  status: JobStatusSchema,
  contractorId: z.string(),
  contractorName: z.string(),
  trade: z.string(),
  description: z.string(),
  shareSystemRecord: z.boolean(),
  tokenId: z.string(),
  address: z.string(),
  requestedAt: IsoDateSchema,
  submission: JobSubmissionSchema.nullable(),
  eventId: z.string().nullable(),
});
export type Job = z.infer<typeof JobSchema>;

export const RequestWorkSchema = z.object({
  contractorId: z.string().min(1),
  trade: z.string().min(1),
  description: z
    .string()
    .min(1, "Describe the work you need so the contractor can respond")
    .max(2000),
  shareSystemRecord: z.boolean().default(true),
});
export type RequestWork = z.infer<typeof RequestWorkSchema>;

export const SubmitWorkSchema = z.object({
  /** Omitted when the contractor submits without a prior request. */
  jobId: z.string().nullable().default(null),
  address: z.string().min(1, "Enter the property address"),
  title: z.string().min(1, "Enter a title for the record").max(200),
  occurredAt: IsoDateSchema,
  amount: z.number().nonnegative().nullable().default(null),
  eventType: EventTypeSchema,
  systemType: z.string().max(80).nullable().default(null),
  description: z.string().max(4000).default(""),
  documentId: z.string().nullable().default(null),
});
export type SubmitWork = z.infer<typeof SubmitWorkSchema>;

export const ContractorSearchRequestSchema = z.object({
  q: z.string().max(200).default(""),
  trade: z.string().max(80).default("All"),
  // Not `z.coerce.boolean()`: that runs JavaScript's Boolean(), which turns the
  // string "false" into true and pins the filter permanently on — hiding the
  // one unverified contractor the demo exists to show.
  verifiedOnly: z
    .union([z.boolean(), z.string()])
    .default(false)
    .transform((value) =>
      typeof value === "boolean" ? value : value === "true" || value === "1",
    ),
});

export const DemoDocumentSchema = z.object({
  key: z.string(),
  title: z.string(),
  hint: z.string(),
  name: z.string(),
  /** Not sent to the browser for listing; only used server-side on selection. */
  preview: z.string().nullable(),
});
export type DemoDocument = z.infer<typeof DemoDocumentSchema>;

export const VerificationChecklistItemSchema = z.object({
  label: z.string(),
  detail: z.string(),
  status: z.enum(["complete", "pending", "missing"]),
  statusLabel: z.string(),
});
export type VerificationChecklistItem = z.infer<
  typeof VerificationChecklistItemSchema
>;

export const UpdateContractorProfileSchema = z.object({
  name: z.string().min(1, "Company name cannot be empty").max(160),
  trade: z.string().min(1, "Enter your trade").max(80),
  license: z.string().max(80),
  zips: z.string().max(200),
});
export type UpdateContractorProfile = z.infer<
  typeof UpdateContractorProfileSchema
>;
