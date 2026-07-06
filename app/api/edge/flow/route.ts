import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import { isProUser } from "@/lib/subscription";
import { getOptionsChain, computeUnusualActivity, UnusualRow } from "@/lib/market-data";

export const runtime = "nodejs";
// Auth-gated response — must never be edge-cached. The shared upstream
// chain data is cached in Redis instead (lib/redis.ts cachedJson).
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_SYMBOLS = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "AMD", "META", "AMZN"];
const MAX_SYMBOLS = 10;
const MAX_TOTAL_ROWS = 50;
const SYMBOL_RE = /^[A-Z.]{1,6}$/;

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await rateLimit(`edge-flow:${userId}`, 30, 60 * 1000);
  if (!success)
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  if (!(await isProUser(userId)))
    return NextResponse.json(
      {
        error: "Unusual-activity screening is a Pro feature.",
        upgradeRequired: true,
      },
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

    const settled = await Promise.allSettled(symbols.map((s) => getOptionsChain(s)));

    const rows: UnusualRow[] = [];
    const failed: string[] = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        rows.push(...computeUnusualActivity(r.value));
      } else {
        failed.push(symbols[i]);
      }
    });

    rows.sort((a, b) => b.estPremium - a.estPremium);

    return NextResponse.json({
      rows: rows.slice(0, MAX_TOTAL_ROWS),
      symbols,
      failed,
      asOf: new Date().toISOString(),
      note: "Delayed data (CBOE). Volume ≥ 250 and vol/OI ≥ 2, ranked by estimated premium.",
    });
  } catch (err) {
    console.error("GET /api/edge/flow error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
