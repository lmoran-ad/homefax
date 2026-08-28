import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { signSession, verifySession } from "./session";

const SECRET = "test-secret-value";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const stored = await hashPassword("demo-password");
    await expect(verifyPassword("demo-password", stored)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const stored = await hashPassword("demo-password");
    await expect(verifyPassword("wrong-password", stored)).resolves.toBe(false);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const a = await hashPassword("demo-password");
    const b = await hashPassword("demo-password");
    expect(a).not.toBe(b);
    await expect(verifyPassword("demo-password", a)).resolves.toBe(true);
    await expect(verifyPassword("demo-password", b)).resolves.toBe(true);
  });

  it("never stores the plaintext", async () => {
    const stored = await hashPassword("demo-password");
    expect(stored).not.toContain("demo-password");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", async () => {
    await expect(verifyPassword("x", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$a$b$c$d$e")).resolves.toBe(false);
    await expect(verifyPassword("x", "")).resolves.toBe(false);
  });
});

describe("session tokens", () => {
  const claims = {
    sub: "11111111-1111-1111-1111-111111111111",
    role: "agent" as const,
    email: "agent@homefax.demo",
  };

  it("round-trips claims", () => {
    const token = signSession(claims, SECRET);
    const result = verifySession(token, SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claims.sub).toBe(claims.sub);
      expect(result.claims.role).toBe("agent");
    }
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession(claims, SECRET);
    expect(verifySession(token, "other-secret")).toMatchObject({
      ok: false,
      reason: "bad-signature",
    });
  });

  it("rejects a tampered payload", () => {
    const token = signSession(claims, SECRET);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...claims, role: "admin", iat: 0, exp: 9e9 }),
    ).toString("base64url");
    expect(verifySession(`${header}.${forged}.${signature}`, SECRET)).toMatchObject({
      ok: false,
      reason: "bad-signature",
    });
  });

  it("rejects an expired token", () => {
    const token = signSession(claims, SECRET, -1);
    expect(verifySession(token, SECRET)).toMatchObject({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects a malformed token", () => {
    expect(verifySession("nope", SECRET)).toMatchObject({ ok: false, reason: "malformed" });
    expect(verifySession("a.b", SECRET)).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("refuses an alg:none header even when the signature field matches", () => {
    // The header must never be trusted to pick the algorithm.
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url",
    );
    const body = Buffer.from(
      JSON.stringify({ ...claims, iat: 0, exp: 9e9 }),
    ).toString("base64url");
    expect(verifySession(`${header}.${body}.`, SECRET).ok).toBe(false);
  });
});
