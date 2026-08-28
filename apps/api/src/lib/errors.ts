import { statusForCode, type ApiError, type ApiErrorCode } from "@hometoken/contracts";

/** Every failure the API reports deliberately is one of these. */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = statusForCode(code);
    this.details = details;
  }

  toJSON(): ApiError {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}

export const badRequest = (message: string, details?: unknown): AppError =>
  new AppError("BAD_REQUEST", message, details);

export const unauthorized = (message = "Sign in to continue"): AppError =>
  new AppError("UNAUTHORIZED", message);

export const forbidden = (message: string): AppError =>
  new AppError("FORBIDDEN", message);

export const notFound = (message: string): AppError =>
  new AppError("NOT_FOUND", message);

export const propertyNotFound = (tokenId: string): AppError =>
  new AppError("PROPERTY_NOT_FOUND", `No HomeToken found for ${tokenId}`);

export const claimRequired = (message: string, details?: unknown): AppError =>
  new AppError("CLAIM_REQUIRED", message, details);

export const claimRejected = (message: string): AppError =>
  new AppError("CLAIM_REJECTED", message);

export const paymentRequired = (message: string, details?: unknown): AppError =>
  new AppError("PAYMENT_REQUIRED", message, details);
