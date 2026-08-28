import "server-only";
import { loadRootEnv } from "./server-env";

loadRootEnv();

/**
 * The single way this app reaches the API, used by both server components and
 * the /api route handler.
 *
 * Two modes:
 *
 *  - `API_BASE_URL` set → HTTP to the standalone Fastify service. That is the
 *    local setup, where `pnpm dev` runs web and api as separate processes.
 *  - unset → run Fastify in-process and dispatch with `app.inject()`. A
 *    serverless platform has nowhere to run a long-lived server, and this
 *    keeps every route, plugin, schema and error handler exactly as written
 *    instead of reimplementing them. It also removes an HTTP hop from server
 *    rendering, which would otherwise be the app calling itself.
 */
const API_BASE = process.env.API_BASE_URL ?? "";

export type DispatchResult = {
  status: number;
  body: string;
  contentType: string;
  setCookie: string[];
};

type FastifyLike = {
  ready: () => Promise<unknown>;
  inject: (options: {
    method: string;
    url: string;
    headers: Record<string, string>;
    payload?: string;
  }) => Promise<{
    statusCode: number;
    headers: Record<string, unknown>;
    body: string;
  }>;
};

// Cached across invocations so a warm instance does not rebuild the app or
// reopen the connection pool on every request.
let appPromise: Promise<FastifyLike> | null = null;

async function getApp(): Promise<FastifyLike> {
  appPromise ??= (async () => {
    const { buildApp } = await import("@homefax/api/app");
    const app = (await buildApp()) as unknown as FastifyLike;
    await app.ready();
    return app;
  })();
  return appPromise;
}

export function isInProcess(): boolean {
  return API_BASE === "";
}

export async function dispatch(input: {
  method: string;
  /** Path beneath /api, including any query string. */
  path: string;
  headers: Record<string, string>;
  body?: string | undefined;
}): Promise<DispatchResult> {
  const url = `/api${input.path}`;

  if (!isInProcess()) {
    const response = await fetch(`${API_BASE}${url}`, {
      method: input.method,
      headers: input.headers,
      body: input.body,
      redirect: "manual",
      cache: "no-store",
    });
    return {
      status: response.status,
      body: await response.text(),
      contentType: response.headers.get("content-type") ?? "application/json",
      setCookie: response.headers.getSetCookie(),
    };
  }

  const app = await getApp();
  const injected = await app.inject({
    method: input.method,
    url,
    headers: input.headers,
    ...(input.body === undefined ? {} : { payload: input.body }),
  });

  const raw = injected.headers["set-cookie"];
  return {
    status: injected.statusCode,
    body: injected.body,
    contentType: String(injected.headers["content-type"] ?? "application/json"),
    setCookie: raw ? (Array.isArray(raw) ? raw.map(String) : [String(raw)]) : [],
  };
}
