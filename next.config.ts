import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's query-engine binary is loaded dynamically at runtime, so
  // Next.js's output file tracing doesn't detect it as a dependency and
  // leaves it out of the deployed serverless function bundle. Force it in,
  // and keep @prisma/client external so bundling doesn't mangle its loader.
  serverExternalPackages: ["@prisma/client"],
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
