import "server-only";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads the monorepo-root .env when running locally.
 *
 * Next reads .env from the app directory, not the workspace root, so a
 * root-level .env shared with the API and the database scripts is invisible to
 * it. On a hosting platform the environment is already populated and there is
 * no file to read, so this is a no-op there.
 *
 * Existing values always win, so the platform's configuration is never
 * overwritten by a stray file.
 */
let loaded = false;

export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;
  if (process.env.VERCEL) return;

  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), "../..", name);
    if (!existsSync(path)) continue;
    // Required lazily so the dependency is not pulled into a serverless bundle
    // that will never use it.
    const { config } = require("dotenv") as typeof import("dotenv");
    config({ path, override: false });
  }
}
