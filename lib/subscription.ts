import { prisma } from "@/lib/prisma";

export async function isProUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });
  return user?.subscriptionPlan === "pro" && user?.subscriptionStatus === "active";
}
