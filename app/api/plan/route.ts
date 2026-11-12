import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ensureUser } from "@/lib/ensure-user";
import {
  computePlanStatus,
  parsePlanInput,
  PlanSettings,
  PlanTrade,
} from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadPlan(userId: string) {
  const row = await prisma.tradingPlan.findUnique({ where: { userId } });
  if (!row) return { plan: null, status: null };

  const plan: PlanSettings = {
    startingBalance: row.startingBalance,
    startDate: row.startDate.toISOString().slice(0, 10),
    riskPct: row.riskPct,
    takeProfitPct: row.takeProfitPct,
    stopLossPct: row.stopLossPct,
    targetWinRate: row.targetWinRate,
    maxTradesPerDay: row.maxTradesPerDay,
    killWindow: row.killWindow,
    killFloor: row.killFloor,
    killRiskPct: row.killRiskPct,
  };

  const trades = (await prisma.tradeEntry.findMany({
    where: { userId, entryDate: { gte: row.startDate } },
    select: {
      id: true,
      ticker: true,
      entryDate: true,
      createdAt: true,
      totalBuyQty: true,
      avgBuyPrice: true,
      realizedPnl: true,
      outcome: true,
    },
  })) as PlanTrade[];

  return { plan, status: computePlanStatus(plan, trades) };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json(await loadPlan(userId));
  } catch (err) {
    console.error("GET /api/plan error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await rateLimit(`plan:${userId}`, 30, 60 * 1000);
  if (!success)
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parsePlanInput(body);
  if (!parsed.ok)
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  const p = parsed.value;

  try {
    await ensureUser(userId);

    const data = {
      startingBalance: p.startingBalance,
      startDate: new Date(p.startDate + "T00:00:00.000Z"),
      riskPct: p.riskPct,
      takeProfitPct: p.takeProfitPct,
      stopLossPct: p.stopLossPct,
      targetWinRate: p.targetWinRate,
      maxTradesPerDay: p.maxTradesPerDay,
      killWindow: p.killWindow,
      killFloor: p.killFloor,
      killRiskPct: p.killRiskPct,
    };

    await prisma.tradingPlan.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return NextResponse.json(await loadPlan(userId));
  } catch (err) {
    console.error("PUT /api/plan error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
