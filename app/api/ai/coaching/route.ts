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
export async function POST(req: NextRequest) {
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

  // Parse optional user question
  let userQuestion = "";
  try {
    const body = await req.json();
    if (body.question && typeof body.question === "string") {
      userQuestion = body.question.slice(0, 500);
    }
  } catch {
    // No body or invalid JSON — that's fine
  }

  const trades = await prisma.tradeEntry.findMany({
    where: { userId },
    orderBy: { entryDate: "desc" },
    take: 200,
    select: {
      ticker: true,
      strategy: true,
      positionType: true,
      optionType: true,
      strike: true,
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

  // Today's trades
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const toStr = (d: Date | string) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);

  const todayTrades = closedTrades.filter((t) => {
    return toStr(t.sellDate ?? t.entryDate) === todayStr;
  });

  // This week's trades (Mon-Fri of current week)
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = monday.toISOString().slice(0, 10);
  const weekTrades = closedTrades.filter((t) => {
    const d = toStr(t.sellDate ?? t.entryDate);
    return d >= mondayStr && d <= todayStr;
  });

  const formatTradeList = (list: typeof closedTrades) =>
    list.map((t) => ({
      ticker: t.ticker,
      option: t.optionType ? `${t.strike} ${t.optionType}` : null,
      strategy: t.strategy,
      position: t.positionType,
      pnl: t.realizedPnl,
      outcome: t.outcome,
      date: toStr(t.sellDate ?? t.entryDate),
      notes: t.notes?.slice(0, 100),
    }));

  const todaySection = todayTrades.length > 0
    ? `\nTODAY'S TRADES (${todayStr}):\n${JSON.stringify(formatTradeList(todayTrades), null, 0)}\nToday's P&L: $${todayTrades.reduce((s, t) => s + (t.realizedPnl ?? 0), 0).toFixed(2)}, ${todayTrades.filter(t => t.outcome === "PROFIT").length}W / ${todayTrades.filter(t => t.outcome === "LOSS").length}L`
    : `\nTODAY'S TRADES: No trades closed today.`;

  const weekPnl = weekTrades.reduce((s, t) => s + (t.realizedPnl ?? 0), 0);
  const weekWins = weekTrades.filter(t => t.outcome === "PROFIT").length;
  const weekLosses = weekTrades.filter(t => t.outcome === "LOSS").length;
  const weekSection = weekTrades.length > 0
    ? `\nTHIS WEEK'S TRADES (${mondayStr} to ${todayStr}):\n${JSON.stringify(formatTradeList(weekTrades), null, 0)}\nWeek P&L: $${weekPnl.toFixed(2)}, ${weekWins}W / ${weekLosses}L, Win Rate: ${weekTrades.length > 0 ? ((weekWins / weekTrades.length) * 100).toFixed(0) : 0}%`
    : `\nTHIS WEEK'S TRADES: No trades closed this week.`;

  const userQuestionSection = userQuestion
    ? `\n\nTRADER'S QUESTION:\nThe trader specifically wants to know: "${userQuestion}"\nPlease address this question in a dedicated "YOUR QUESTION" section at the end of the report.`
    : "";

  const prompt = `You are an expert options trading coach. Analyze this trader's performance at three levels: today, this week, and overall. Give SPECIFIC, ACTIONABLE coaching based on their actual data.
${todaySection}
${weekSection}

OVERALL STATS:
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
${userQuestionSection}

Provide your coaching in these sections:
1. TODAY'S REVIEW (analyze today's trades specifically — what went well, what didn't. If no trades today, briefly note that)
2. WEEKLY PERFORMANCE (analyze this week's trades as a group — patterns, wins/losses, momentum)
3. STRENGTHS (2-3 specific things they're doing well overall)
4. WEAKNESSES (2-3 specific patterns hurting them overall)
5. ACTION ITEMS (3-4 concrete steps to improve, referencing their actual data)
6. RISK MANAGEMENT (specific advice based on their win/loss sizes)
${userQuestion ? "7. YOUR QUESTION (directly answer the trader's specific question using their data)" : ""}

Be direct, specific, and reference actual numbers from their trades. No generic advice. ~500 words.`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25000, maxRetries: 1 });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [{ role: "user", content: prompt }],
  });

  const coaching = completion.choices?.[0]?.message?.content?.trim() || "";

  // Save to database
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
