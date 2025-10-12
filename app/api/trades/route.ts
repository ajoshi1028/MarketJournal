// app/api/trades/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ---------- helpers ----------
type Fill = { qty: number; price: number };

function parseFills(maybeFills: any): Fill[] {
  if (!Array.isArray(maybeFills)) return [];
  return maybeFills
    .map((f) => ({ qty: Number(f?.qty), price: Number(f?.price) }))
    .filter(
      (f) =>
        Number.isFinite(f.qty) &&
        f.qty > 0 &&
        Number.isFinite(f.price) &&
        f.price >= 0
    );
}

// Weighted average
function weightedAvg(fills: Fill[]): number | null {
  const totalQty = fills.reduce((s, f) => s + f.qty, 0);
  if (totalQty === 0) return null;
  const value = fills.reduce((s, f) => s + f.price * f.qty, 0);
  return value / totalQty;
}

// Realized P&L using avg cost; options multiplier = 100 ($0.01 = $1)
function computeRealizedPnl(buys: Fill[], sells: Fill[]): number {
  const buyQty = buys.reduce((s, f) => s + f.qty, 0);
  const sellQty = sells.reduce((s, f) => s + f.qty, 0);
  if (buyQty === 0 || sellQty === 0) return 0;

  const avgBuy = weightedAvg(buys);
  const avgSell = weightedAvg(sells);
  if (avgBuy == null || avgSell == null) return 0;

  const contractsClosed = Math.min(buyQty, sellQty);
  const perContract = (avgSell - avgBuy) * 100; // 0.01 == $1
  return perContract * contractsClosed;
}

// ---------- routes ----------
export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const trades = await prisma.tradeEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(trades, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/trades error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trades", details: error?.message ?? "Unknown" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure user row (and we’ll upsert Account below)
    const client = await clerkClient();
    const cu = await client.users.getUser(userId).catch(() => null);
    const email = (
      cu?.primaryEmailAddress?.emailAddress ??
      cu?.emailAddresses?.[0]?.emailAddress ??
      `${userId}@placeholder.local`
    ).toLowerCase();
    const name =
      (cu?.fullName ??
        [cu?.firstName, cu?.lastName].filter(Boolean).join(" ")) || null;

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email, name },
    });

    const body = await req.json();
    const {
      ticker,
      strategy,
      positionType, // "LONG" | "SHORT"
      entryDate,    // ISO or yyyy-mm-dd
      sellDate,     // optional
      buyFills,     // [{qty, price}, ...]
      sellFills,    // [{qty, price}, ...]
      notes,
    } = body ?? {};

    // Validate
    if (!ticker)       return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
    if (!positionType) return NextResponse.json({ error: "Position type is required" }, { status: 400 });
    if (!entryDate)    return NextResponse.json({ error: "Entry date is required" }, { status: 400 });

    const buys = parseFills(buyFills);
    const sells = parseFills(sellFills);

    const avgBuy  = weightedAvg(buys);
    const avgSell = weightedAvg(sells);
    const totalBuyQty  = buys.reduce((s, f) => s + f.qty, 0);
    const totalSellQty = sells.reduce((s, f) => s + f.qty, 0);
    const realizedPnl  = computeRealizedPnl(buys, sells); // dollars (>= 0 or <= 0)

    let outcome: "PROFIT" | "LOSS" | null = null;
    if (realizedPnl > 0) outcome = "PROFIT";
    else if (realizedPnl < 0) outcome = "LOSS";

    // TRANSACTION: create trade + upsert & increment Account.balance
    const [trade] = await prisma.$transaction([
      prisma.tradeEntry.create({
        data: {
          userId,
          ticker: String(ticker).trim().toUpperCase(),
          strategy: strategy?.trim() || null,
          positionType,
          entryDate: new Date(entryDate),
          sellDate: sellDate ? new Date(sellDate) : null,
          buyFills: buys.length ? buys : undefined,  // stored as JSON
          sellFills: sells.length ? sells : undefined,
          totalBuyQty,
          totalSellQty,
          avgBuyPrice:  avgBuy  ?? null,
          avgSellPrice: avgSell ?? null,
          realizedPnl:  realizedPnl || 0,
          outcome,
          notes: notes?.trim() || null,
        },
      }),
      prisma.account.upsert({
        where: { userId },
        update: { balance: { increment: realizedPnl || 0 } },
        create: { userId, balance: realizedPnl || 0 },
      }),
    ]);

    return NextResponse.json(trade, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/trades error:", error);
    return NextResponse.json(
      { error: "Failed to create trade", details: error?.message ?? "Unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tradeId = searchParams.get("id");
    if (!tradeId) return NextResponse.json({ error: "Trade ID required" }, { status: 400 });

    const trade = await prisma.tradeEntry.findUnique({ where: { id: tradeId } });
    if (!trade || trade.userId !== userId) {
      return NextResponse.json({ error: "Trade not found or unauthorized" }, { status: 404 });
    }

    const delta = trade.realizedPnl ?? 0;
    const adjust = -delta; // reverse the prior impact

    await prisma.$transaction([
      prisma.tradeEntry.delete({ where: { id: tradeId } }),
      prisma.account.upsert({
        where: { userId },
        update: { balance: { increment: adjust } }, // works with positive/negative numbers
        create: { userId, balance: adjust },
      }),
    ]);

    return NextResponse.json({ message: "Trade deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/trades error:", error);
    return NextResponse.json(
      { error: "Failed to delete trade", details: error?.message ?? "Unknown" },
      { status: 500 }
    );
  }
}
