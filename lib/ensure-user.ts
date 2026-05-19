import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function ensureUser(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return;

  const client = await clerkClient();
  const cu = await client.users.getUser(userId).catch(() => null);
  const email = (
    cu?.primaryEmailAddress?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    `${userId}@placeholder.local`
  ).toLowerCase();
  const name =
    (cu?.fullName ??
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ")) ||
    null;

  await prisma.user.upsert({
    where: { email },
    update: { name: name ?? undefined },
    create: { id: userId, email, name },
  });
}
