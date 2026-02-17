import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Trace dependencies from monorepo root for proper serverless bundling
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
