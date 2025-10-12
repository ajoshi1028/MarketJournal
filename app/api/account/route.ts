// app/api/account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// GET: return (and lazily create) the user's account
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // make sure we have a User row
    const cu = await (await clerkClient()).users.getUser(userId).catch(() => null);
    const email = (cu?.primaryEmailAddress?.emailAddress ?? cu?.emailAddresses?.[0]?.emailAddress ?? `${userId}@placeholder.local`).toLowerCase();
    const name =
      (cu?.fullName ?? [cu?.firstName, cu?.lastName].filter(Boolean).join(" ")) || null;

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email, name },
    });

    // upsert account with balance 0 if missing
    const account = await prisma.account.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 0 },
    });

    return NextResponse.json({ balance: account.balance }, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/account error:", e);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}

/**
 * PATCH: modify the balance
 * body: { action: "set" | "add" | "withdraw", amount: number }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, amount } = await req.json();
    const amt = Number(amount);
    if (!["set", "add", "withdraw"].includes(action) || !Number.isFinite(amt)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // ensure account exists
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
        data: { balance: { increment: amt } },
      });
    } else {
      account = await prisma.account.update({
        where: { userId },
        data: { balance: { decrement: amt } },
      });
    }

    return NextResponse.json({ balance: account.balance }, { status: 200 });
  } catch (e: any) {
    console.error("PATCH /api/account error:", e);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
