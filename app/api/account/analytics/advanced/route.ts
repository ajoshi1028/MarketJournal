import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trades = await prisma.tradeEntry.findMany({
    where: { userId },
    orderBy: { entryDate: "asc" },
    select: {
      id: true,
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
      totalSellQty: true,
      tags: true,
    },
  });

  const closedTrades = trades.filter(
    (t) => t.outcome === "PROFIT" || t.outcome === "LOSS",
  );
  const totalClosed = closedTrades.length;
  const wins = closedTrades.filter((t) => t.outcome === "PROFIT");
  const losses = closedTrades.filter((t) => t.outcome === "LOSS");

  const overallWinRate = totalClosed > 0 ? (wins.length / totalClosed) * 100 : 0;

  // Win rate by strategy
  const strategyMap = new Map<string, { wins: number; total: number; pnl: number }>();
  for (const t of closedTrades) {
    const s = t.strategy || "No Strategy";
    const entry = strategyMap.get(s) || { wins: 0, total: 0, pnl: 0 };
    entry.total++;
    entry.pnl += t.realizedPnl ?? 0;
    if (t.outcome === "PROFIT") entry.wins++;
    strategyMap.set(s, entry);
  }
  const byStrategy = Array.from(strategyMap.entries())
    .map(([name, data]) => ({
      name,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      trades: data.total,
      pnl: data.pnl,
    }))
    .sort((a, b) => b.trades - a.trades);

  // Win rate by ticker
  const tickerMap = new Map<string, { wins: number; total: number; pnl: number }>();
  for (const t of closedTrades) {
    const entry = tickerMap.get(t.ticker) || { wins: 0, total: 0, pnl: 0 };
    entry.total++;
    entry.pnl += t.realizedPnl ?? 0;
    if (t.outcome === "PROFIT") entry.wins++;
    tickerMap.set(t.ticker, entry);
  }
  const byTicker = Array.from(tickerMap.entries())
    .map(([name, data]) => ({
      name,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      trades: data.total,
      pnl: data.pnl,
    }))
    .sort((a, b) => b.trades - a.trades);

  // P&L by day of week
  const weekdayPnl = new Array(7).fill(0);
  const weekdayCount = new Array(7).fill(0);
  for (const t of closedTrades) {
    const d = t.sellDate ?? t.entryDate;
    const day = new Date(d).getDay();
    weekdayPnl[day] += t.realizedPnl ?? 0;
    weekdayCount[day]++;
  }
  const pnlByWeekday = WEEKDAYS.map((name, i) => ({
    name,
    pnl: weekdayPnl[i],
    trades: weekdayCount[i],
  }));

  // Average hold time (in days)
  const holdTimes: number[] = [];
  for (const t of closedTrades) {
    if (t.sellDate && t.entryDate) {
      const ms = new Date(t.sellDate).getTime() - new Date(t.entryDate).getTime();
      if (ms >= 0) holdTimes.push(ms / (1000 * 60 * 60 * 24));
    }
  }
  const avgHoldDays =
    holdTimes.length > 0
      ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length
      : 0;

  // Average win / average loss
  const avgWin =
    wins.length > 0
      ? wins.reduce((s, t) => s + (t.realizedPnl ?? 0), 0) / wins.length
      : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((s, t) => s + (t.realizedPnl ?? 0), 0) / losses.length)
      : 0;

  // Risk/Reward ratio
  const riskReward = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Expectancy = (win% * avgWin) - (loss% * avgLoss)
  const winPct = totalClosed > 0 ? wins.length / totalClosed : 0;
  const lossPct = totalClosed > 0 ? losses.length / totalClosed : 0;
  const expectancy = winPct * avgWin - lossPct * avgLoss;

  // Profit factor = gross profits / gross losses
  const grossProfit = wins.reduce((s, t) => s + (t.realizedPnl ?? 0), 0);
  const grossLoss = Math.abs(
    losses.reduce((s, t) => s + (t.realizedPnl ?? 0), 0),
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

  // Streaks
  let currentStreak = 0;
  let currentStreakType: "win" | "loss" | null = null;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let runningWin = 0;
  let runningLoss = 0;

  for (const t of closedTrades) {
    if (t.outcome === "PROFIT") {
      if (currentStreakType === "win") {
        runningWin++;
      } else {
        runningWin = 1;
        currentStreakType = "win";
      }
      runningLoss = 0;
      maxWinStreak = Math.max(maxWinStreak, runningWin);
    } else {
      if (currentStreakType === "loss") {
        runningLoss++;
      } else {
        runningLoss = 1;
        currentStreakType = "loss";
      }
      runningWin = 0;
      maxLossStreak = Math.max(maxLossStreak, runningLoss);
    }
  }
  currentStreak = currentStreakType === "win" ? runningWin : -runningLoss;

  // Largest win / loss
  const largestWin = wins.length
    ? Math.max(...wins.map((t) => t.realizedPnl ?? 0))
    : 0;
  const largestLoss = losses.length
    ? Math.min(...losses.map((t) => t.realizedPnl ?? 0))
    : 0;

  // Monthly performance
  const monthlyMap = new Map<string, number>();
  for (const t of closedTrades) {
    const d = new Date(t.sellDate ?? t.entryDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (t.realizedPnl ?? 0));
  }
  const monthlyPerformance = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({ month, pnl }));

  return NextResponse.json({
    overview: {
      totalTrades: trades.length,
      closedTrades: totalClosed,
      openTrades: trades.length - totalClosed,
      winRate: overallWinRate,
      avgWin,
      avgLoss,
      riskReward,
      expectancy,
      profitFactor,
      avgHoldDays,
      largestWin,
      largestLoss,
      grossProfit,
      grossLoss,
      netPnl: grossProfit - grossLoss,
    },
    streaks: {
      current: currentStreak,
      maxWin: maxWinStreak,
      maxLoss: maxLossStreak,
    },
    byStrategy,
    byTicker,
    pnlByWeekday,
    monthlyPerformance,
  });
}
