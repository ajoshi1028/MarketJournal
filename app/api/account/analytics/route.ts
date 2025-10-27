// app/api/account/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient, TradeOutcome } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient({ log: ["warn", "error"] });

type Bucket = "day" | "week" | "month" | "year";

// simple bucket key (local time)
function bucketKey(d: Date, bucket: Bucket) {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-11
  const w = Math.floor((d.getTime() - new Date(y, 0, 1).getTime()) / (7 * 86400000));
  const day = new Date(y, m, d.getDate());
  if (bucket === "day")   return day.toISOString().slice(0, 10);                 // YYYY-MM-DD
  if (bucket === "week")  return `${y}-W${String(w + 1).padStart(2, "0")}`;      // YYYY-W##
  if (bucket === "month") return `${y}-${String(m + 1).padStart(2, "0")}`;       // YYYY-MM
  return String(y);                                                                // year
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const bucket = (searchParams.get("bucket") as Bucket) || "month";

    // Pull trades once
    const trades = await prisma.tradeEntry.findMany({
      where: { userId },
      orderBy: { entryDate: "asc" },
      select: {
        id: true,
        ticker: true,
        positionType: true,      // "LONG" | "SHORT"
        entryDate: true,
        sellDate: true,
        realizedPnl: true,       // number | null (dollars)
        outcome: true,           // "PROFIT" | "LOSS" | null
      },
    });

    // ---- Growth series (cumulative P&L) ----
    // If you later add Account.startingBalance, you can seed with that.
    let cumulative = 0;
    const pointsMap = new Map<string, number>();

    for (const t of trades) {
      const d = t.sellDate ?? t.entryDate;       // if not sold, bucket by entry date
      const key = bucketKey(new Date(d), bucket);
      const pnl = t.realizedPnl ?? 0;
      // accumulate within bucket
      pointsMap.set(key, (pointsMap.get(key) ?? 0) + pnl);
    }

    // Sort keys chronologically
    const sortedKeys = Array.from(pointsMap.keys()).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const growth = sortedKeys.map((k) => {
      cumulative += pointsMap.get(k)!;
      return { bucket: k, cumulativePnl: cumulative };
    });

    // ---- Pie datasets ----
    let winsLong = 0, winsShort = 0, lossesLong = 0, lossesShort = 0;
    const winsByTicker: Record<string, number> = {};

    for (const t of trades) {
      if (t.outcome === "PROFIT") {
        t.positionType === "SHORT" ? winsShort++ : winsLong++;
        winsByTicker[t.ticker] = (winsByTicker[t.ticker] ?? 0) + 1;
      } else if (t.outcome === "LOSS") {
        t.positionType === "SHORT" ? lossesShort++ : lossesLong++;
      }
    }

    // Sort wins-by-ticker and cap to top 6 + "Other"
    const topTickers = Object.entries(winsByTicker)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const otherCount =
      Object.values(winsByTicker).reduce((s, n) => s + n, 0) -
      topTickers.reduce((s, [, n]) => s + n, 0);

    const winsByTickerPie = [
      ...topTickers.map(([ticker, value]) => ({ name: ticker, value })),
      ...(otherCount > 0 ? [{ name: "Other", value: otherCount }] : []),
    ];

    return NextResponse.json(
      {
        growth,                                  // [{ bucket, cumulativePnl }]
        winsLongShort: [
          { name: "Long", value: winsLong },
          { name: "Short", value: winsShort },
        ],
        lossesLongShort: [
          { name: "Long", value: lossesLong },
          { name: "Short", value: lossesShort },
        ],
        winsByTicker: winsByTickerPie,           // pie slices
        totals: {
          trades: trades.length,
          wins: winsLong + winsShort,
          losses: lossesLong + lossesShort,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/account/analytics error:", err);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
