import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const current = await prisma.account.findUnique({ where: { userId } });
    if (current && current.balance < Math.abs(amt))
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    account = await prisma.account.update({
      where: { userId },
      data: { balance: { decrement: Math.abs(amt) } },
    });
  }

  return NextResponse.json({ balance: account.balance });
}
