import { z } from "zod";
import {
  AgentClaimMethodSchema,
  ClaimStatusSchema,
  OwnerClaimMethodSchema,
  ProofDocumentSchema,
} from "./enums";
import { IsoDateSchema } from "./property";

export const ClaimSchema = z.object({
  tokenId: z.string(),
  status: ClaimStatusSchema,
  /** Display label, e.g. "MLS" or "Title & escrow". */
  method: z.string(),
  mlsNumber: z.string().nullable(),
  escrowNumber: z.string().nullable(),
  agentName: z.string(),
  claimedAt: IsoDateSchema,
  expiresAt: IsoDateSchema.nullable(),
  daysUntilExpiry: z.number().int().nullable(),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const HomeClaimSchema = z.object({
  tokenId: z.string(),
  status: ClaimStatusSchema,
  method: z.string(),
  verifiedAt: IsoDateSchema.nullable(),
  requestedAt: IsoDateSchema.nullable(),
});
export type HomeClaim = z.infer<typeof HomeClaimSchema>;

export const CLAIM_STATE_KEYS = [
  "unclaimed",
  "pending",
  "other",
  "active",
] as const;
export const ClaimStateKeySchema = z.enum(CLAIM_STATE_KEYS);
export type ClaimStateKey = z.infer<typeof ClaimStateKeySchema>;

export const ClaimStateSchema = z.object({
  key: ClaimStateKeySchema,
  label: z.string(),
});
export type ClaimState = z.infer<typeof ClaimStateSchema>;

/**
 * The single authority on whether the signed-in user may write to a record.
 * The API computes it; the web renders the lock panel from it. Never derive
 * write permission on the client — this object is the whole answer.
 */
export const ContributeStateSchema = z.object({
  allowed: z.boolean(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  ctaLabel: z.string().nullable(),
  /** What the CTA should do, as a route hint the web resolves. */
  ctaAction: z
    .enum(["claim", "ownerClaim", "claimStatus", "ownerClaimStatus", "jobs"])
    .nullable(),
});
export type ContributeState = z.infer<typeof ContributeStateSchema>;

export const AgentClaimRequestSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("mls"),
    mlsNumber: z.string().min(1, "Enter the MLS number for this listing"),
  }),
  z.object({
    method: z.literal("seller"),
    acknowledged: z.literal(true, {
      error: "Confirm that you have the owner's permission to request stewardship",
    }),
  }),
  z.object({
    method: z.literal("title"),
    escrowNumber: z
      .string()
      .min(1, "Enter the escrow or file number from the title company"),
  }),
]);
export type AgentClaimRequest = z.infer<typeof AgentClaimRequestSchema>;

export const OwnerClaimRequestSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("record") }),
  z.object({
    method: z.literal("proof"),
    proofDocument: ProofDocumentSchema,
  }),
]);
export type OwnerClaimRequest = z.infer<typeof OwnerClaimRequestSchema>;

export const ClaimResultSchema = z.object({
  status: ClaimStatusSchema,
  method: z.string(),
  claimedAt: IsoDateSchema,
  expiresAt: IsoDateSchema.nullable(),
  reference: z.string().nullable(),
});
export type ClaimResult = z.infer<typeof ClaimResultSchema>;

export const SeededRecordStatsSchema = z.object({
  events: z.number().int(),
  documents: z.number().int(),
  ownershipPeriods: z.number().int(),
  healthScore: z.number().int(),
});
export type SeededRecordStats = z.infer<typeof SeededRecordStatsSchema>;

export { AgentClaimMethodSchema, OwnerClaimMethodSchema };
