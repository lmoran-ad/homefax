import { defineConfig, devices } from "@playwright/test";

/**
 * The e2e suite drives a running stack rather than starting one, because the
 * API and web are separate services and the database has to be seeded first.
 * Run `pnpm db:reset && pnpm dev` in another terminal, then `pnpm test:e2e`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      // The sandbox ships Chromium at a fixed path; unset to use Playwright's.
      ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
        : {}),
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
