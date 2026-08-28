"use client";

import type { ApiError } from "@homefax/contracts";

export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    readonly error: ApiError,
  ) {
    super(error.message);
    this.name = "ClientApiError";
  }

  /** The paywall payload, when this failure was a plan gate. */
  get paywall(): Record<string, unknown> | null {
    if (this.error.code !== "PAYMENT_REQUIRED") return null;
    return (this.error.details as Record<string, unknown>) ?? null;
  }
}

/** Browser-side call, through the same-origin proxy so the cookie rides along. */
export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error: ApiError }).error
        : ({ code: "INTERNAL", message: "The request failed" } as ApiError);
    throw new ClientApiError(response.status, error);
  }
  return payload as T;
}
