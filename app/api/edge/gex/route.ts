import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import { isProUser } from "@/lib/subscription";
import { getOptionsChain, computeExposureProfile } from "@/lib/market-data";

export const runtime = "nodejs";
// Auth-gated response — never edge-cache; chains are Redis-cached upstream.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYMBOL_RE = /^[A-Z.]{1,6}$/;

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await rateLimit(`edge-gex:${userId}`, 30, 60 * 1000);
  if (!success)
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  if (!(await isProUser(userId)))
    return NextResponse.json(
      { error: "Exposure heatmaps are a Pro feature.", upgradeRequired: true },
      { status: 403 },
    );

  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") ?? "SPY").trim().toUpperCase();
    const metricRaw = searchParams.get("metric");
    const metric = metricRaw === "vex" ? "vex" : "gex";

    if (!SYMBOL_RE.test(symbol))
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

    const chain = await getOptionsChain(symbol);
    if (!chain)
      return NextResponse.json(
        { error: `No options data available for ${symbol}.` },
        { status: 404 },
      );

    const profile = computeExposureProfile(chain, metric);
    return NextResponse.json(profile);
  } catch (err) {
    console.error("GET /api/edge/gex error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
