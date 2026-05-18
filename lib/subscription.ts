import { prisma } from "@/lib/prisma";

const FREE_LIMITS = {
  aiCoaching: 10,
  aiAnalysis: 10,
  aiChart: 10,
} as const;

type Feature = keyof typeof FREE_LIMITS;

const USAGE_COLUMN: Record<Feature, "aiCoachingUsed" | "aiAnalysisUsed" | "aiChartUsed"> = {
  aiCoaching: "aiCoachingUsed",
  aiAnalysis: "aiAnalysisUsed",
  aiChart: "aiChartUsed",
};

export async function isProUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });
  return user?.subscriptionPlan === "pro" && user?.subscriptionStatus === "active";
}

export async function checkFeatureAccess(
  userId: string,
  feature: Feature,
): Promise<{ allowed: boolean; remaining: number; isPro: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      aiCoachingUsed: true,
      aiAnalysisUsed: true,
      aiChartUsed: true,
    },
  });

  if (!user) return { allowed: false, remaining: 0, isPro: false };

  const isPro = user.subscriptionPlan === "pro" && user.subscriptionStatus === "active";
  if (isPro) return { allowed: true, remaining: -1, isPro: true };

  const used = user[USAGE_COLUMN[feature]];
  const limit = FREE_LIMITS[feature];
  const remaining = Math.max(0, limit - used);

  return { allowed: remaining > 0, remaining, isPro: false };
}

export async function incrementUsage(userId: string, feature: Feature): Promise<void> {
  const col = USAGE_COLUMN[feature];
  await prisma.user.update({
    where: { id: userId },
    data: { [col]: { increment: 1 } },
  });
}

export async function getUsageSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      aiCoachingUsed: true,
      aiAnalysisUsed: true,
      aiChartUsed: true,
    },
  });

  if (!user) return null;

  const isPro = user.subscriptionPlan === "pro" && user.subscriptionStatus === "active";

  return {
    isPro,
    coaching: { used: user.aiCoachingUsed, limit: FREE_LIMITS.aiCoaching },
    analysis: { used: user.aiAnalysisUsed, limit: FREE_LIMITS.aiAnalysis },
    chart: { used: user.aiChartUsed, limit: FREE_LIMITS.aiChart },
  };
}
