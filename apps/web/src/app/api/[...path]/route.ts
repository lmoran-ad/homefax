import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves the API.
 *
 * Two modes, one route:
 *
 *  - `API_BASE_URL` set → proxy to the standalone Fastify service. This is the
 *    local development setup, where `pnpm dev` runs web and api separately.
 *  - unset → run the Fastify app in-process and dispatch through
 *    `app.inject()`. Vercel has nowhere to run a long-lived server, and this
 *    keeps every route, plugin, schema and error handler exactly as written
 *    rather than reimplementing them as Next handlers. `inject` is Fastify's
 *    own request dispatcher; no socket is involved.
 *
 * Either way the browser only ever talks to its own origin, so the session
 * cookie needs no CORS or SameSite negotiation.
 */
const API_BASE = process.env.API_BASE_URL;

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

// Cached across invocations so a warm lambda does not rebuild the app or
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

function passthroughHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const cookie = request.headers.get("cookie");
  if (cookie) headers.cookie = cookie;
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  return headers;
}

function applySetCookie(response: NextResponse, value: unknown): void {
  if (!value) return;
  for (const cookie of Array.isArray(value) ? value : [value]) {
    response.headers.append("set-cookie", String(cookie));
  }
}

async function handle(request: NextRequest, path: string[]): Promise<Response> {
  const suffix = `/api/${path.join("/")}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  if (API_BASE) {
    const upstream = await fetch(`${API_BASE}${suffix}`, {
      method: request.method,
      headers: passthroughHeaders(request),
      body,
      redirect: "manual",
    });
    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
    for (const cookie of upstream.headers.getSetCookie()) {
      response.headers.append("set-cookie", cookie);
    }
    return response;
  }

  const app = await getApp();
  const injected = await app.inject({
    method: request.method,
    url: suffix,
    headers: passthroughHeaders(request),
    ...(body === undefined ? {} : { payload: body }),
  });

  const response = new NextResponse(injected.body, {
    status: injected.statusCode,
    headers: {
      "content-type": String(injected.headers["content-type"] ?? "application/json"),
    },
  });
  applySetCookie(response, injected.headers["set-cookie"]);
  return response;
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  return handle(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: Context) {
  return handle(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: Context) {
  return handle(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: Context) {
  return handle(request, (await context.params).path);
}
