import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureUser(userId: string) {
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

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    await prisma.user.update({
      where: { email },
      data: { id: userId, name: name ?? existingByEmail.name },
    });
  } else {
    await prisma.user.create({
      data: { id: userId, email, name },
    });
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUser(userId);

  const account = await prisma.account.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0 },
  });

  return NextResponse.json({ balance: account.balance });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = String(body?.action ?? "");
  const amt = Number(body?.amount);

  if (!["set", "add", "withdraw"].includes(action) || !Number.isFinite(amt))
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  if (amt < 0 && action === "set")
    return NextResponse.json({ error: "Balance cannot be negative" }, { status: 400 });

  await prisma.account.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0 },
  });

  let account;
  if (action === "set") {
    account = await prisma.account.update({
      where: { userId },
      data: { balance: amt },
    });
  } else if (action === "add") {
    account = await prisma.account.update({
      where: { userId },
      data: { balance: { increment: Math.abs(amt) } },
    });
  } else {
    account = await prisma.account.update({
      where: { userId },
      data: { balance: { decrement: Math.abs(amt) } },
    });
  }

  return NextResponse.json({ balance: account.balance });
}
