import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Integration tests share one PostgreSQL database, so they must not run
    // concurrently against it.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
