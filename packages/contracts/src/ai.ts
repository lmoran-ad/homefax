import { z } from "zod";
import { ConfidenceSchema } from "./enums";
import { IsoDateSchema } from "./property";

/**
 * What the assistant must return. Validated before anything reaches the UI —
 * a model that ignores the schema gets treated as a failure and falls back,
 * rather than rendering half an answer.
 */
export const HomeAnswerSchema = z.object({
  answer: z.string().min(1),
  confidence: ConfidenceSchema,
  eventIds: z.array(z.string()).default([]),
  caveat: z.string().nullable().default(null),
});
export type HomeAnswer = z.infer<typeof HomeAnswerSchema>;

export const AskRequestSchema = z.object({
  question: z.string().min(1, "Ask a question").max(1000),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;

export const AskResponseSchema = z.object({
  answer: z.string(),
  confidence: ConfidenceSchema,
  /** Already filtered to event IDs that exist on this property. */
  eventIds: z.array(z.string()),
  caveat: z.string().nullable(),
  /** True when the answer came from the local record index, not the model. */
  fallback: z.boolean(),
  questionsUsed: z.number().int(),
  questionsAllowed: z.number().int().nullable(),
});
export type AskResponse = z.infer<typeof AskResponseSchema>;

export const AI_EXTRACTABLE_EVENT_TYPES = [
  "REPAIR",
  "IMPROVEMENT",
  "SYSTEM_INSTALLATION",
  "SYSTEM_SERVICE",
  "INSPECTION",
  "WARRANTY",
  "DOCUMENT_ADDED",
] as const;

/**
 * The extraction contract. Every scalar is nullable and every list defaults to
 * empty on purpose: the prompt forbids guessing, so "not in the document" has
 * to be representable. A model that fills these in anyway is easy to spot.
 */
export const ExtractedPropertyEventSchema = z.object({
  suggestedEventType: z.enum(AI_EXTRACTABLE_EVENT_TYPES),
  title: z.string(),
  description: z.string(),
  occurredAt: IsoDateSchema.nullable(),
  contractor: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().default("USD"),
  category: z.string().nullable(),
  materials: z.array(z.string()).default([]),
  warrantyYears: z.number().nullable(),
  permitNumber: z.string().nullable(),
  systemType: z.string().nullable(),
  confidence: ConfidenceSchema,
  evidence: z.array(z.string()).default([]),
});
export type ExtractedPropertyEvent = z.infer<typeof ExtractedPropertyEventSchema>;

export const ExtractionResponseSchema = z.object({
  documentId: z.string(),
  documentName: z.string(),
  sha256: z.string(),
  preview: z.string(),
  proposal: ExtractedPropertyEventSchema,
  /** True when extraction failed and this is the blank manual-entry proposal. */
  manual: z.boolean(),
});
export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

export const ExtractionRequestSchema = z.object({
  /** One of the seeded demo documents, by key. */
  demoDocumentKey: z.string().optional(),
  /** Or a pasted/uploaded document: name plus its text. */
  fileName: z.string().max(200).optional(),
  text: z.string().max(200_000).optional(),
});
export type ExtractionRequest = z.infer<typeof ExtractionRequestSchema>;
