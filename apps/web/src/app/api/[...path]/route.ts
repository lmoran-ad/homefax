import { NextResponse, type NextRequest } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:4000";

/**
 * Same-origin proxy to the API service.
 *
 * Client components post to /api/… and the session cookie rides along without
 * any CORS or SameSite negotiation, and the API's own origin never has to be
 * reachable from the browser. Set-Cookie from sign-in and sign-out is passed
 * straight back through.
 */
async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const target = new URL(`${API_BASE}/api/${path.join("/")}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
    redirect: "manual",
  });

  const body = await upstream.text();
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });

  for (const value of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", value);
  }
  return response;
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: Context) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: Context) {
  return proxy(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: Context) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: Context) {
  return proxy(request, (await context.params).path);
}
