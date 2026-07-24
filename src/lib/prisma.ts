import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function resetPrismaClient(): void {
  if (globalForPrisma.prisma) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch {
      // Ignore disconnect errors on already closed socket
    }
    globalForPrisma.prisma = undefined;
  }
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();

/**
 * Executes a Prisma query with automatic retry & client reset on database connection errors (e.g. E57P01)
 */
export async function safePrismaQuery<T>(
  queryFn: (client: PrismaClient) => Promise<T>
): Promise<T> {
  try {
    const client = getPrismaClient();
    return await queryFn(client);
  } catch (error: any) {
    const errMessage = String(error?.message || error);
    const isConnError =
      errMessage.includes("E57P01") ||
      errMessage.includes("terminating connection") ||
      errMessage.includes("P1001") ||
      errMessage.includes("P1008") ||
      errMessage.includes("Closed connection") ||
      errMessage.includes("Engine failed to start");

    if (isConnError) {
      console.warn("[Prisma] Detected connection termination. Re-initializing client and retrying query...", errMessage);
      resetPrismaClient();
      const freshClient = getPrismaClient();
      return await queryFn(freshClient);
    }

    throw error;
  }
}

