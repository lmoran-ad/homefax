import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@hometoken/contracts";

export type SessionClaims = {
  /** Profile id. */
  sub: string;
  role: Role;
  email: string;
  /** Issued at, seconds. */
  iat: number;
  /** Expires at, seconds. */
  exp: number;
};

export const SESSION_COOKIE = "ht_session";

/** Long session when "keep me signed in" is ticked, short one when it is not. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SHORT_SESSION_TTL_SECONDS = 60 * 60 * 12;

const b64u = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

/**
 * A compact HS256 JWT. Hand-rolled rather than pulled from a library because
 * the demo needs exactly one algorithm and one key, and this keeps the auth
 * seam small enough to read in full before replacing it with OIDC.
 *
 * `alg` is fixed at HS256 on verify — the header is never trusted to select
 * the algorithm, which is how the classic `alg: none` bypass works.
 */
export function signSession(
  claims: Omit<SessionClaims, "iat" | "exp">,
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: SessionClaims = { ...claims, iat, exp: iat + ttlSeconds };
  const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(payload));
  const signature = sign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export type VerifyResult =
  | { ok: true; claims: SessionClaims }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

export function verifySession(token: string, secret: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [header, body, signature] = parts as [string, string, string];

  const expected = sign(`${header}.${body}`, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-signature" };
  }

  let claims: SessionClaims;
  try {
    const decodedHeader = JSON.parse(
      Buffer.from(header, "base64url").toString("utf8"),
    ) as { alg?: unknown };
    if (decodedHeader.alg !== "HS256") return { ok: false, reason: "malformed" };
    claims = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionClaims;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof claims.sub !== "string" || typeof claims.exp !== "number") {
    return { ok: false, reason: "malformed" };
  }
  if (claims.exp <= Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, claims };
}
