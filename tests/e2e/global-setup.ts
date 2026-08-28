import { execFileSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";

/**
 * Reseeds before every run.
 *
 * The suite writes to the record — it appends events, claims properties and
 * runs the contractor loop — so without this the second run starts from the
 * first run's leftovers and assertions about seeded counts stop holding. The
 * acceptance criteria ask for the demo path to pass twice consecutively; this
 * is what makes that true.
 *
 * Playwright loads this file as CommonJS, so it uses `config.rootDir` rather
 * than `import.meta.url` to locate the repo.
 */
export default function globalSetup(config: FullConfig): void {
  if (process.env.E2E_SKIP_RESEED === "true") return;
  execFileSync("pnpm", ["db:reset"], {
    cwd: config.rootDir.replace(/[\\/]tests[\\/]e2e$/, ""),
    stdio: "inherit",
  });
}
