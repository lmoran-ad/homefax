import { cookies } from "next/headers";
import type { ApiError } from "@homefax/contracts";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly error: ApiError,
  ) {
    super(error.message);
    this.name = "ApiRequestError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

/**
 * Server-side API call. Forwards the incoming session cookie so the API sees
 * the same user the page is rendering for.
 *
 * The web app never opens a database connection; everything it knows comes
 * through here.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const response = await fetch(`${API_BASE}/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload
        ? ((payload as { error: ApiError }).error satisfies ApiError)
        : ({ code: "INTERNAL", message: "The request failed" } as ApiError);
    throw new ApiRequestError(response.status, error);
  }

  return payload as T;
}

/** Returns null instead of throwing when the caller has no session. */
export async function apiFetchOptional<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 404)) {
      return null;
    }
    throw error;
  }
}

export { API_BASE };
