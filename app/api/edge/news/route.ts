import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import { isProUser } from "@/lib/subscription";
import { getTickerNews, NewsItem } from "@/lib/market-data";

export const runtime = "nodejs";
// Auth-gated response — never edge-cache; news is Redis-cached upstream.
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const DEFAULT_SYMBOLS = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL"];
const MAX_SYMBOLS = 6;
const MAX_ITEMS = 30;
const SYMBOL_RE = /^[A-Z.]{1,6}$/;

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await rateLimit(`edge-news:${userId}`, 30, 60 * 1000);
  if (!success)
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  if (!(await isProUser(userId)))
    return NextResponse.json(
      { error: "The news feed is a Pro feature.", upgradeRequired: true },
      { status: 403 },
    );

  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("symbols");
    const symbols = (raw ? raw.split(",") : DEFAULT_SYMBOLS)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => SYMBOL_RE.test(s))
      .slice(0, MAX_SYMBOLS);

    if (symbols.length === 0)
      return NextResponse.json({ error: "No valid symbols" }, { status: 400 });

    const settled = await Promise.allSettled(symbols.map((s) => getTickerNews(s)));

    // Merge, dedupe (same story surfaces under multiple tickers), newest first.
    const seen = new Set<string>();
    const items: NewsItem[] = [];
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const item of r.value) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        items.push(item);
      }
    }
    items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    return NextResponse.json({
      items: items.slice(0, MAX_ITEMS),
      symbols,
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /api/edge/news error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
