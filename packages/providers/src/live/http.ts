/**
 * The one place a provider talks to the outside world.
 *
 * Public data portals are not infrastructure anyone here controls: they go
 * down, they rate limit, they answer slowly, and — in the ArcGIS case — they
 * report failure with HTTP 200 and an error object in the body. Every live
 * provider goes through this so that all of those arrive as one exception type
 * carrying the name of the source that failed, rather than as a stack trace
 * from whichever line happened to touch the response first.
 */

export class SourceError extends Error {
  constructor(
    readonly source: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(`${source}: ${message}`, options);
    this.name = "SourceError";
  }
}

export type FetchJsonOptions = {
  source: string;
  url: string;
  headers?: Record<string, string>;
  /** Total budget per attempt. Kept short: a page render is waiting on this. */
  timeoutMs?: number;
};

/**
 * One retry, and only for a failure that could plausibly be transient. A
 * portal that returns 404 will return 404 again, and retrying it only makes
 * the page slower before it fails.
 */
export async function fetchJson<T>(options: FetchJsonOptions): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 6_000;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(options.url, {
        headers: { accept: "application/json", ...options.headers },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const error = new SourceError(
          options.source,
          `HTTP ${response.status} from ${hostOf(options.url)}`,
        );
        if (!retryable || attempt === 1) throw error;
        lastError = error;
        continue;
      }

      return (await response.json()) as T;
    } catch (caught) {
      if (caught instanceof SourceError && attempt === 1) throw caught;
      if (caught instanceof SourceError) {
        lastError = caught;
        continue;
      }
      // A timeout or a socket failure. Worth one more try.
      lastError = new SourceError(
        options.source,
        caught instanceof Error ? caught.message : String(caught),
        { cause: caught },
      );
      if (attempt === 1) throw lastError;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new SourceError(options.source, "request failed");
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Reads a number out of whatever a portal decided to encode it as. */
export function num(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Reads a date out of a portal's field and returns YYYY-MM-DD, or null. */
export function isoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  // Esri encodes dates as epoch milliseconds; Socrata as ISO strings.
  const asDate =
    typeof value === "number" ? new Date(value) : new Date(String(value));
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate.toISOString().slice(0, 10);
}

export function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
