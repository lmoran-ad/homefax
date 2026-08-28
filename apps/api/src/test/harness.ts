import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadServerEnv, resetServerEnv } from "@hometoken/config";
import { closeDb } from "@hometoken/db";
import { __setProviders, LocalStorageProvider } from "@hometoken/providers";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { createContext } from "../lib/context.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://hometoken:hometoken@localhost:5432/hometoken_test";

export type Harness = {
  app: FastifyInstance;
  storageRoot: string;
  close: () => Promise<void>;
};

/**
 * Boots the API against a freshly migrated and seeded test database, with
 * document storage pointed at a throwaway directory.
 *
 * The seed runs through the real CLI rather than a fixture shortcut, so these
 * tests exercise the same data the demo does — including the real hashes.
 */
export async function createHarness(): Promise<Harness> {
  const storageRoot = await mkdtemp(join(tmpdir(), "ht-api-test-"));

  const env = {
    ...process.env,
    NODE_ENV: "test",
    DEMO_MODE: "true",
    DEMO_TODAY: "2026-08-28",
    DATABASE_URL: TEST_DATABASE_URL,
    AUTH_JWT_SECRET: "test-secret-value",
    LOCAL_STORAGE_PATH: storageRoot,
    ANTHROPIC_API_KEY: "",
  };

  const run = (script: string) =>
    execFileSync("pnpm", ["--filter", "@hometoken/db", script], {
      cwd: repoRoot,
      env,
      stdio: "pipe",
    });

  run("reset");

  Object.assign(process.env, env);
  resetServerEnv();
  await closeDb();

  // Storage is per-run, so seeded documents written by the CLI above and any
  // written during the tests land in the same throwaway directory.
  __setProviders({ storage: new LocalStorageProvider(storageRoot) });

  const ctx = createContext(loadServerEnv(env as NodeJS.ProcessEnv));
  const app = await buildApp(ctx);
  await app.ready();

  return {
    app,
    storageRoot,
    close: async () => {
      await app.close();
      await closeDb();
      await rm(storageRoot, { recursive: true, force: true });
    },
  };
}

type InjectOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  payload?: unknown;
  cookie?: string | null;
};

export type Response<T = unknown> = {
  status: number;
  body: T;
  cookie: string | null;
};

export async function call<T = unknown>(
  app: FastifyInstance,
  options: InjectOptions,
): Promise<Response<T>> {
  const response = await app.inject({
    method: options.method ?? "GET",
    url: options.url,
    payload: options.payload as never,
    headers: options.cookie ? { cookie: options.cookie } : {},
  });

  const setCookie = response.headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const cookie = raw ? String(raw).split(";")[0]! : null;

  let body: T;
  try {
    body = response.json<T>();
  } catch {
    body = response.body as unknown as T;
  }
  return { status: response.statusCode, body, cookie };
}

export async function signIn(
  app: FastifyInstance,
  email: string,
): Promise<string> {
  const response = await call(app, {
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password: "demo-password", keepSignedIn: true },
  });
  if (!response.cookie) {
    throw new Error(`Sign-in failed for ${email}: ${JSON.stringify(response.body)}`);
  }
  return response.cookie;
}

export const SHOWCASE = "HT-US-CO-DEN-00001234";
export const UNCLAIMED = "HT-US-CO-DEN-00002187";
export const AGENT = "agent@hometoken.demo";
export const OWNER = "owner@hometoken.demo";
export const CONTRACTOR = "summit@hometoken.demo";
