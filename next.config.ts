import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep @prisma/client external so bundling doesn't mangle its native
  // query-engine loader. Using the default (non-custom) Prisma output
  // location means Next.js's built-in file tracing already knows to bundle
  // the engine binary for deployment — no manual outputFileTracingIncludes
  // needed here.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
