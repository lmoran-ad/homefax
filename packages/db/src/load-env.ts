import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

/**
 * Loads the repo-root .env for CLI entry points (migrate, seed, reset) so they
 * work from any working directory. The API and web apps load their own env.
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");

for (const name of [".env.local", ".env"]) {
  const path = resolve(root, name);
  if (existsSync(path)) config({ path });
}
