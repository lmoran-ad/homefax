import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source rather than a build step, and
  // the API is bundled into the route handler when there is no separate
  // service to proxy to.
  transpilePackages: [
    "@homefax/contracts",
    "@homefax/api",
    "@homefax/db",
    "@homefax/auth",
    "@homefax/ai",
    "@homefax/fixtures",
    "@homefax/ledger",
    "@homefax/config",
    "@homefax/providers",
  ],
  serverExternalPackages: ["pg"],
  typedRoutes: false,
};

export default config;
