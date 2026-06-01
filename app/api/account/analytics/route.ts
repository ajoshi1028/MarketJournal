import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Bucket = "day" | "week" | "month" | "year";

const VALID_BUCKETS = new Set<string>(["day", "week", "month", "year"]);

function bucketKey(d: Date, bucket: Bucket): string {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (bucket === "day") return new Date(y, m, d.getDate()).toISOString().slice(0, 10);
  if (bucket === "week") {
    const w = Math.floor(
      (d.getTime() - new Date(y, 0, 1).getTime()) / (7 * 86400000),
    );
    return `${y}-W${String(w + 1).padStart(2, "0")}`;
  }
  if (bucket === "month") return `${y}-${String(m + 1).padStart(2, "0")}`;
  return String(y);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
  const { searchParams } = new URL(req.url);
  const rawBucket = searchParams.get("bucket") || "month";
  const bucket: Bucket = VALID_BUCKETS.has(rawBucket)
    ? (rawBucket as Bucket)
    : "month";

  const trades = await prisma.tradeEntry.findMany({
    where: { userId },
    orderBy: { entryDate: "asc" },
    select: {
      ticker: true,
      positionType: true,
      entryDate: true,
      sellDate: true,
      realizedPnl: true,
      outcome: true,
    },
  });

  let cumulative = 0;
  const pointsMap = new Map<string, number>();

  for (const t of trades) {
    const d = t.sellDate ?? t.entryDate;
    const key = bucketKey(new Date(d), bucket);
    pointsMap.set(key, (pointsMap.get(key) ?? 0) + (t.realizedPnl ?? 0));
  }

  const sortedKeys = Array.from(pointsMap.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  const growth = sortedKeys.map((k) => {
    cumulative += pointsMap.get(k)!;
    return { bucket: k, cumulativePnl: cumulative };
  });

  let winsLong = 0;
  let winsShort = 0;
  let lossesLong = 0;
  let lossesShort = 0;
  const winsByTicker: Record<string, number> = {};

  for (const t of trades) {
    if (t.outcome === "PROFIT") {
      t.positionType === "SHORT" ? winsShort++ : winsLong++;
      winsByTicker[t.ticker] = (winsByTicker[t.ticker] ?? 0) + 1;
    } else if (t.outcome === "LOSS") {
      t.positionType === "SHORT" ? lossesShort++ : lossesLong++;
    }
  }

  const topTickers = Object.entries(winsByTicker)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const otherCount =
    Object.values(winsByTicker).reduce((s, n) => s + n, 0) -
    topTickers.reduce((s, [, n]) => s + n, 0);

  return NextResponse.json({
    growth,
    winsLongShort: [
      { name: "Long", value: winsLong },
      { name: "Short", value: winsShort },
    ],
    lossesLongShort: [
      { name: "Long", value: lossesLong },
      { name: "Short", value: lossesShort },
    ],
    winsByTicker: [
      ...topTickers.map(([ticker, value]) => ({ name: ticker, value })),
      ...(otherCount > 0 ? [{ name: "Other", value: otherCount }] : []),
    ],
    totals: {
      trades: trades.length,
      wins: winsLong + winsShort,
      losses: lossesLong + lossesShort,
    },
  });
  } catch (err) {
    console.error("GET /api/account/analytics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
