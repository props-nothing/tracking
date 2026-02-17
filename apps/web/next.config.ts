import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trace dependencies from monorepo root for proper serverless bundling
  outputFileTracingRoot: "../../",
};

export default nextConfig;
