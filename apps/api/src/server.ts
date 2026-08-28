import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
for (const name of [".env.local", ".env"]) {
  const path = resolve(root, name);
  if (existsSync(path)) config({ path });
}

const { loadServerEnv } = await import("@hometoken/config");
const { buildApp } = await import("./app.js");

const env = loadServerEnv();
const app = await buildApp();

try {
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  app.log.info(
    `HomeToken API listening on ${env.API_BASE_URL} (demo mode: ${env.DEMO_MODE})`,
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
