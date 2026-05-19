import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { checkFeatureAccess, incrementUsage } from "@/lib/subscription";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET — fetch history or a specific date's report
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  // If a specific date is requested, return that report
  if (dateStr) {
    const d = new Date(dateStr + "T00:00:00.000Z");
    if (isNaN(d.getTime()))
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    const report = await prisma.coachingReport.findUnique({
      where: { userId_date: { userId, date: d } },
    });
    return NextResponse.json(report);
  }

  // Otherwise return all report dates for the calendar
  const reports = await prisma.coachingReport.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
    take: 365,
  });
  return NextResponse.json(reports);
}

// POST — generate a new coaching report for today
export async function POST() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const access = await checkFeatureAccess(userId, "aiCoaching");
  if (!access.allowed)
    return NextResponse.json({
      error: "You've used all 10 free coaching reports. Upgrade to Pro for unlimited access.",
      upgradeRequired: true,
    }, { status: 403 });

  const { success } = await rateLimit(`coaching:${userId}`, 5, 60 * 60 * 1000);
  if (!success)
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  const trades = await prisma.tradeEntry.findMany({
    where: { userId },
    orderBy: { entryDate: "desc" },
    take: 200,
    select: {
      ticker: true,
      strategy: true,
      positionType: true,
      entryDate: true,
      sellDate: true,
      realizedPnl: true,
      outcome: true,
      avgBuyPrice: true,
      avgSellPrice: true,
      totalBuyQty: true,
      notes: true,
    },
  });

  if (trades.length < 3)
    return NextResponse.json({
      coaching:
        "You need at least 3 closed trades before I can provide meaningful coaching. Keep trading and journaling!",
    });

  const closedTrades = trades.filter(
    (t) => t.outcome === "PROFIT" || t.outcome === "LOSS",
  );
  const wins = closedTrades.filter((t) => t.outcome === "PROFIT");
  const losses = closedTrades.filter((t) => t.outcome === "LOSS");
  const winRate = closedTrades.length
    ? ((wins.length / closedTrades.length) * 100).toFixed(1)
    : "0";

  const avgWin =
    wins.length > 0
      ? (
          wins.reduce((s, t) => s + (t.realizedPnl ?? 0), 0) / wins.length
        ).toFixed(2)
      : "0";
  const avgLoss =
    losses.length > 0
      ? (
          Math.abs(
            losses.reduce((s, t) => s + (t.realizedPnl ?? 0), 0),
          ) / losses.length
        ).toFixed(2)
      : "0";

  const strategies = new Map<string, { wins: number; losses: number }>();
  for (const t of closedTrades) {
    const s = t.strategy || "None";
    const entry = strategies.get(s) || { wins: 0, losses: 0 };
    t.outcome === "PROFIT" ? entry.wins++ : entry.losses++;
    strategies.set(s, entry);
  }

  const tickers = new Map<
    string,
    { wins: number; losses: number; pnl: number }
  >();
  for (const t of closedTrades) {
    const entry = tickers.get(t.ticker) || { wins: 0, losses: 0, pnl: 0 };
    entry.pnl += t.realizedPnl ?? 0;
    t.outcome === "PROFIT" ? entry.wins++ : entry.losses++;
    tickers.set(t.ticker, entry);
  }

  const weekdayPnl = new Array(7).fill(0);
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  for (const t of closedTrades) {
    const d = new Date(t.sellDate ?? t.entryDate);
    weekdayPnl[d.getDay()] += t.realizedPnl ?? 0;
  }

  const recentTrades = closedTrades.slice(0, 20).map((t) => ({
    ticker: t.ticker,
    strategy: t.strategy,
    position: t.positionType,
    pnl: t.realizedPnl,
    outcome: t.outcome,
    notes: t.notes?.slice(0, 100),
  }));

  const prompt = `You are an expert options trading coach. Analyze this trader's history and give SPECIFIC, ACTIONABLE coaching.

STATS:
- Total closed trades: ${closedTrades.length}
- Win rate: ${winRate}%
- Average win: $${avgWin}
- Average loss: $${avgLoss}

STRATEGY BREAKDOWN:
${Array.from(strategies.entries())
  .map(
    ([s, d]) =>
      `  ${s}: ${d.wins}W / ${d.losses}L (${((d.wins / (d.wins + d.losses)) * 100).toFixed(0)}%)`,
  )
  .join("\n")}

TOP TICKERS:
${Array.from(tickers.entries())
  .sort((a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl))
  .slice(0, 10)
  .map(
    ([t, d]) =>
      `  ${t}: ${d.wins}W / ${d.losses}L, P&L: $${d.pnl.toFixed(2)}`,
  )
  .join("\n")}

P&L BY WEEKDAY:
${weekdays.map((d, i) => `  ${d}: $${weekdayPnl[i].toFixed(2)}`).join("\n")}

RECENT 20 TRADES:
${JSON.stringify(recentTrades, null, 0)}

Provide your coaching in these sections:
1. STRENGTHS (2-3 specific things they're doing well)
2. WEAKNESSES (2-3 specific patterns hurting them)
3. ACTION ITEMS (3-4 concrete steps to improve, referencing their actual data)
4. RISK MANAGEMENT (specific advice based on their win/loss sizes)
5. NEXT WEEK FOCUS (one specific thing to focus on)

Be direct, specific, and reference actual numbers. No generic advice. ~400 words.`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25000, maxRetries: 1 });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [{ role: "user", content: prompt }],
  });

  const coaching = completion.choices?.[0]?.message?.content?.trim() || "";

  // Save to database
  const today = new Date();
  const dateOnly = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  await prisma.coachingReport.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    update: { content: coaching },
    create: { userId, date: dateOnly, content: coaching },
  });

  if (!access.isPro) await incrementUsage(userId, "aiCoaching");

  return NextResponse.json({
    coaching,
    date: dateOnly.toISOString(),
    remaining: access.isPro ? -1 : access.remaining - 1,
  });
}
