import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// scrypt is in Node's standard library, so the demo needs no native build step
// to hash passwords properly. Parameters follow the current OWASP guidance for
// scrypt; raising N is the knob to turn as hardware improves.
//
// maxmem must be raised alongside N: scrypt needs 128 * N * r bytes, which at
// N=2^15, r=8 is exactly Node's 32 MiB default and so is rejected. Setting it
// to twice the requirement leaves headroom for a future N bump.
const PARAMS = {
  N: 2 ** 15,
  r: 8,
  p: 1,
  maxmem: 128 * 2 ** 15 * 8 * 2,
} as const;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/** `scrypt$N$r$p$salt$hash`, all base64url. Self-describing, so parameters can change. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const salt = Buffer.from(parts[4]!, "base64url");
  const expected = Buffer.from(parts[5]!, "base64url");

  let derived: Buffer;
  try {
    // Derive maxmem from the stored parameters rather than the current
    // constants, so hashes written under an older N still verify.
    derived = await scryptAsync(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * N * r * 2,
    });
  } catch {
    return false;
  }

  // Lengths must match before timingSafeEqual, which throws otherwise.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
