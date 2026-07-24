import { getPrismaClient } from "@/lib/prisma";

export interface AiCreditStatus {
  allowed: boolean;
  remainingCredits: number;
  creditsUsed: number;
  maxDailyCredits: number;
  message?: string;
}

export const DEFAULT_MAX_DAILY_AI_CREDITS = 20;

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Checks and deducts 1 AI generation credit for the user today.
 * Enforces daily credit limit (default 20 credits per day).
 */
export async function checkAndDeductAiCredit(userId: string): Promise<AiCreditStatus> {
  const date = getTodayDateString();
  const db = getPrismaClient();

  // Defensive fallback if aiUsage delegate is not available on cached client
  if (!db || !(db as any).aiUsage) {
    return {
      allowed: true,
      remainingCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
      creditsUsed: 0,
      maxDailyCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
    };
  }

  try {
    let usage = await db.aiUsage.findUnique({
      where: { userId_date: { userId, date } },
    });

    if (!usage) {
      usage = await db.aiUsage.create({
        data: {
          userId,
          date,
          creditsUsed: 0,
          maxDailyCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
        },
      });
    }

    if (usage.creditsUsed >= usage.maxDailyCredits) {
      return {
        allowed: false,
        remainingCredits: 0,
        creditsUsed: usage.creditsUsed,
        maxDailyCredits: usage.maxDailyCredits,
        message: `You have reached your daily AI credit limit (${usage.maxDailyCredits}/${usage.maxDailyCredits} used today). Credits reset at midnight!`,
      };
    }

    // Increment credit usage
    const updated = await db.aiUsage.update({
      where: { id: usage.id },
      data: { creditsUsed: { increment: 1 } },
    });

    const remaining = Math.max(0, updated.maxDailyCredits - updated.creditsUsed);

    return {
      allowed: true,
      remainingCredits: remaining,
      creditsUsed: updated.creditsUsed,
      maxDailyCredits: updated.maxDailyCredits,
    };
  } catch (err) {
    console.warn("AiUsage database check fallback:", err);
    return {
      allowed: true,
      remainingCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
      creditsUsed: 0,
      maxDailyCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
    };
  }
}

/**
 * Retrieves remaining AI credits for the user today without deducting
 */
export async function getRemainingAiCredits(userId: string): Promise<AiCreditStatus> {
  const date = getTodayDateString();
  const db = getPrismaClient();

  if (!db || !(db as any).aiUsage) {
    return {
      allowed: true,
      remainingCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
      creditsUsed: 0,
      maxDailyCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
    };
  }

  try {
    const usage = await db.aiUsage.findUnique({
      where: { userId_date: { userId, date } },
    });

    if (!usage) {
      return {
        allowed: true,
        remainingCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
        creditsUsed: 0,
        maxDailyCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
      };
    }

    const remaining = Math.max(0, usage.maxDailyCredits - usage.creditsUsed);

    return {
      allowed: remaining > 0,
      remainingCredits: remaining,
      creditsUsed: usage.creditsUsed,
      maxDailyCredits: usage.maxDailyCredits,
    };
  } catch {
    return {
      allowed: true,
      remainingCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
      creditsUsed: 0,
      maxDailyCredits: DEFAULT_MAX_DAILY_AI_CREDITS,
    };
  }
}
