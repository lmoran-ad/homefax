import { z } from "zod";
import {
  ConfidenceSchema,
  EventTypeSchema,
  SystemKeySchema,
  SystemStatusSchema,
  VerificationLevelSchema,
  VisibilitySchema,
} from "./enums";

/** `YYYY-MM-DD`. Property events are day-precision; time of day is noise here. */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

export const TokenIdSchema = z
  .string()
  .regex(/^HT-[A-Z]{2}-[A-Z]{2}-[A-Z]{3}-\d{8}$/, "Not a valid HomeToken ID");

export const DocumentSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  visibility: VisibilitySchema,
  sha256: z.string(),
  eventId: z.string().nullable(),
  eventTitle: z.string().nullable(),
  occurredAt: IsoDateSchema.nullable(),
  /** Withheld unless the caller is allowed to read the document body. */
  text: z.string().nullable(),
});
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;

export const PropertyEventSchema = z.object({
  id: z.string(),
  eventType: EventTypeSchema,
  occurredAt: IsoDateSchema,
  title: z.string(),
  /** Human-readable one-liner shown under the title. */
  meta: z.string(),
  description: z.string().nullable(),
  verificationLevel: VerificationLevelSchema,
  visibility: VisibilitySchema,
  supersedesEventId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  documents: z.array(DocumentSummarySchema),
  eventHash: z.string(),
  previousHash: z.string().nullable(),
});
export type PropertyEvent = z.infer<typeof PropertyEventSchema>;

export const PropertySystemSchema = z.object({
  key: SystemKeySchema,
  name: z.string(),
  status: SystemStatusSchema,
  verificationLevel: VerificationLevelSchema,
  sourceEventId: z.string().nullable(),
  hidden: z.boolean(),
  rows: z.array(z.tuple([z.string(), z.string()])),
});
export type PropertySystem = z.infer<typeof PropertySystemSchema>;

export const OwnershipPeriodSchema = z.object({
  sequenceNumber: z.number().int(),
  label: z.string(),
  range: z.string(),
  verificationLevel: VerificationLevelSchema,
  isCurrent: z.boolean(),
});
export type OwnershipPeriod = z.infer<typeof OwnershipPeriodSchema>;

export const HealthBarSchema = z.object({
  key: SystemKeySchema,
  label: z.string(),
  weight: z.number(),
  points: z.number(),
  pct: z.number(),
  status: SystemStatusSchema,
});

export const HealthScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  confidence: z.enum(["High", "Medium", "Low"]),
  knownSystems: z.number().int(),
  totalSystems: z.number().int(),
  bars: z.array(HealthBarSchema),
});
export type HealthScore = z.infer<typeof HealthScoreSchema>;

export const LedgerStateSchema = z.object({
  valid: z.boolean(),
  checkedEvents: z.number().int(),
  invalidEventId: z.string().nullable(),
  verifiedAt: z.string(),
  genesisDate: IsoDateSchema.nullable(),
});
export type LedgerState = z.infer<typeof LedgerStateSchema>;

export const PropertySummarySchema = z.object({
  tokenId: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  parcelId: z.string(),
  estimatedValue: z.number().nullable(),
  healthScore: z.number().int().min(0).max(100).nullable(),
  eventCount: z.number().int(),
  isShowcase: z.boolean(),
  isProvisioned: z.boolean(),
});
export type PropertySummary = z.infer<typeof PropertySummarySchema>;

export const PropertyFactsSchema = z.object({
  propertyType: z.string(),
  yearBuilt: z.number().int(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  livingSqft: z.number().int(),
  lotSqft: z.number().int(),
});

export const PropertyDetailSchema = PropertySummarySchema.extend({
  facts: PropertyFactsSchema,
  systems: z.array(PropertySystemSchema),
  ownership: z.array(OwnershipPeriodSchema),
  events: z.array(PropertyEventSchema),
  documents: z.array(DocumentSummarySchema),
  health: HealthScoreSchema,
  ledger: LedgerStateSchema,
  mlsNumber: z.string().nullable(),
});
export type PropertyDetail = z.infer<typeof PropertyDetailSchema>;

export const PropertySearchRequestSchema = z.object({
  q: z.string().max(200).default(""),
});
export type PropertySearchRequest = z.infer<typeof PropertySearchRequestSchema>;

export const PropertySearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(PropertySummarySchema),
});
export type PropertySearchResponse = z.infer<typeof PropertySearchResponseSchema>;

export const AddressLookupResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("found"), property: PropertySummarySchema }),
  z.object({ kind: z.literal("missing"), query: z.string() }),
]);
export type AddressLookupResponse = z.infer<typeof AddressLookupResponseSchema>;

export const ProvisionRequestSchema = z.object({
  address: z.string().min(3).max(200),
});

export const AppendEventRequestSchema = z.object({
  title: z.string().min(1, "A title is required").max(200),
  eventType: EventTypeSchema,
  occurredAt: IsoDateSchema,
  description: z.string().max(4000).default(""),
  contractor: z.string().max(160).nullable().default(null),
  amount: z.number().nonnegative().nullable().default(null),
  permitNumber: z.string().max(80).nullable().default(null),
  systemType: z.string().max(80).nullable().default(null),
  verificationLevel: VerificationLevelSchema,
  visibility: VisibilitySchema,
  materials: z.array(z.string()).default([]),
  /** Document produced by the Add Record upload step, if there was one. */
  documentId: z.string().nullable().default(null),
});
export type AppendEventRequest = z.infer<typeof AppendEventRequestSchema>;

export const TransferRequestSchema = z.object({
  newOwnerName: z.string().min(1, "Enter the new owner's name").max(160),
  newOwnerEmail: z.email("Enter a valid email so the new owner can be invited"),
  transferDate: IsoDateSchema,
  acknowledged: z.literal(true, {
    error: "Acknowledge the simulated-transfer notice to continue",
  }),
});
export type TransferRequest = z.infer<typeof TransferRequestSchema>;

export const TransferResultSchema = z.object({
  newOwnerName: z.string(),
  newOwnerEmail: z.string(),
  ownershipPeriodNumber: z.number().int(),
  retainedEventCount: z.number().int(),
  transferEventId: z.string(),
  ledger: LedgerStateSchema,
});
export type TransferResult = z.infer<typeof TransferResultSchema>;

export { ConfidenceSchema };
