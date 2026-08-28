import { NextResponse, type NextRequest } from "next/server";
import { dispatch } from "@/lib/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The browser's entry point to the API.
 *
 * Everything the client does goes through this same-origin route, so the
 * session cookie rides along with no CORS or SameSite negotiation and the API
 * never needs to be reachable from a browser. Where the request actually goes
 * — a separate Fastify service, or Fastify running in-process — is decided by
 * `dispatch`.
 */

/**
 * An allowlist rather than a blind copy: forwarding every inbound header would
 * pass along hop-by-hop headers and whatever else a client chose to send, and
 * the API only ever reads these.
 */
const FORWARDED_HEADERS = ["cookie", "content-type", "x-seed-secret"] as const;

function passthroughHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

async function handle(request: NextRequest, path: string[]): Promise<Response> {
  const canHaveBody = request.method !== "GET" && request.method !== "HEAD";
  const text = canHaveBody ? await request.text() : "";

  // An empty string is not a body. Plenty of the API's POSTs take no payload
  // at all — accept a job, sign out — and the browser still announces a JSON
  // content type with them. Forwarding "" alongside that header makes the JSON
  // parser reject a request that was perfectly well formed, so the content
  // type goes with the body it was describing.
  const headers = passthroughHeaders(request);
  if (text === "") delete headers["content-type"];

  const result = await dispatch({
    method: request.method,
    path: `/${path.join("/")}${request.nextUrl.search}`,
    headers,
    body: text === "" ? undefined : text,
  });

  const response = new NextResponse(result.body, {
    status: result.status,
    headers: { "content-type": result.contentType },
  });
  for (const cookie of result.setCookie) {
    response.headers.append("set-cookie", cookie);
  }
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
