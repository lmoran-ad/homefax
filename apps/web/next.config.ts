import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source rather than a build step.
  transpilePackages: ["@hometoken/contracts"],
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    typedRoutes: false,
  },
};

export default config;
