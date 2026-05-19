import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const VALID_INTERVALS = new Set([
  "1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo",
]);

const TICKER_MAP: Record<string, string> = {
  NDXP: "^NDX",
  NDX: "^NDX",
  SPX: "^GSPC",
  SPXW: "^GSPC",
  XSP: "^GSPC",
  RUT: "^RUT",
  RUTW: "^RUT",
  DJX: "^DJI",
  VIX: "^VIX",
  VIXW: "^VIX",
  OEX: "^OEX",
  XEO: "^OEX",
  NDX100: "^NDX",
  ES: "ES=F",
  NQ: "NQ=F",
  YM: "YM=F",
  RTY: "RTY=F",
  CL: "CL=F",
  GC: "GC=F",
  SI: "SI=F",
};

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const interval = searchParams.get("interval") || "1d";

  if (!symbol || !from || !to) {
    return NextResponse.json({ error: "Missing symbol, from, or to" }, { status: 400 });
  }

  if (!VALID_INTERVALS.has(interval)) {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }

  const resolvedSymbol = TICKER_MAP[symbol.toUpperCase()] || symbol;

  const period1 = Math.floor(new Date(from).getTime() / 1000);
  const period2 = Math.floor(new Date(to).getTime() / 1000) + 86400;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolvedSymbol)}?period1=${period1}&period2=${period2}&interval=${interval}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const data = await res.json();

    if (!res.ok || data?.chart?.error) {
      return NextResponse.json({ candles: [], error: data?.chart?.error?.description || "No data available" });
    }

    const result = data?.chart?.result?.[0];

    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return NextResponse.json({ candles: [] });
    }

    const timestamps: number[] = result.timestamp;
    const quote = result.indicators.quote[0];
    const isIntraday = !interval.includes("d") && !interval.includes("wk") && !interval.includes("mo");

    const candles = timestamps
      .map((ts: number, i: number) => {
        const o = quote.open?.[i];
        const h = quote.high?.[i];
        const l = quote.low?.[i];
        const c = quote.close?.[i];
        if (o == null || h == null || l == null || c == null) return null;

        if (isIntraday) {
          return {
            time: ts,
            open: +o.toFixed(2),
            high: +h.toFixed(2),
            low: +l.toFixed(2),
            close: +c.toFixed(2),
          };
        }

        const d = new Date(ts * 1000);
        return {
          time: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
          open: +o.toFixed(2),
          high: +h.toFixed(2),
          low: +l.toFixed(2),
          close: +c.toFixed(2),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ candles, isIntraday });
  } catch {
    return NextResponse.json({ error: "Chart data unavailable" }, { status: 502 });
  }
}
