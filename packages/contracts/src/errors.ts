import { z } from "zod";

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "SESSION_EXPIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "PROPERTY_NOT_FOUND",
  "INVALID_TOKEN_ID",
  "CLAIM_REQUIRED",
  "CLAIM_REJECTED",
  "PAYMENT_REQUIRED",
  "AI_UNAVAILABLE",
  "EXTRACTION_FAILED",
  "UNSUPPORTED_DOCUMENT",
  "UPLOAD_FAILED",
  "LEDGER_INVALID",
  "CONFLICT",
  "INTERNAL",
] as const;

export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PROPERTY_NOT_FOUND: 404,
  INVALID_TOKEN_ID: 400,
  CLAIM_REQUIRED: 403,
  CLAIM_REJECTED: 422,
  PAYMENT_REQUIRED: 402,
  AI_UNAVAILABLE: 503,
  EXTRACTION_FAILED: 422,
  UNSUPPORTED_DOCUMENT: 415,
  UPLOAD_FAILED: 500,
  LEDGER_INVALID: 500,
  CONFLICT: 409,
  INTERNAL: 500,
};

export function statusForCode(code: ApiErrorCode): number {
  return STATUS_BY_CODE[code];
}
