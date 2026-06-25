import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { putPublicObject } from "@/lib/s3";
import { rateLimit } from "@/lib/rate-limit";
import { ensureUser } from "@/lib/ensure-user";
import { parseFills, weightedAvg, computeRealizedPnl } from "@/lib/trade-math";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TICKER_LENGTH = 10;
const MAX_STRATEGY_LENGTH = 100;
const MAX_NOTES_LENGTH = 2000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function sanitizeString(val: unknown, maxLen: number): string {
  return String(val ?? "")
    .trim()
    .slice(0, maxLen);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const limitParam = url.searchParams.get("limit");

    // Paginated mode: when limit is explicitly set
    if (limitParam) {
      const limit = Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 100);
      const [trades, total] = await Promise.all([
        prisma.tradeEntry.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
        cursor ? Promise.resolve(null) : prisma.tradeEntry.count({ where: { userId } }),
      ]);

      const hasMore = trades.length > limit;
      const items = hasMore ? trades.slice(0, limit) : trades;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      return NextResponse.json({ items, nextCursor, ...(total != null ? { total } : {}) });
    }

    // Legacy mode: return all trades as array (for Dashboard, Track, etc.)
    const trades = await prisma.tradeEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(trades);
  } catch (err) {
    console.error("GET /api/trades error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await rateLimit(`trades:${userId}`, 60, 60 * 60 * 1000);
  if (!success)
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  await ensureUser(userId);

  const isMultipart = (req.headers.get("content-type") || "").includes(
    "multipart/form-data",
  );

  let payload: Record<string, unknown> = {};
  let chartFile: File | null = null;

  if (isMultipart) {
    const fd = await req.formData();
    const get = (k: string) => fd.get(k)?.toString().trim() ?? "";
    payload = {
      ticker: get("ticker"),
      strategy: get("strategy") || null,
      positionType: get("positionType"),
      optionType: get("optionType") || null,
      strike: get("strike") || null,
      expiry: get("expiry") || null,
      entryDate: get("entryDate"),
      entryTime: get("entryTime") || null,
      sellDate: get("sellDate") || null,
      exitTime: get("exitTime") || null,
      buyFills: (() => { try { return JSON.parse(get("buyFills") || "[]"); } catch { return []; } })(),
      sellFills: (() => { try { return JSON.parse(get("sellFills") || "[]"); } catch { return []; } })(),
      notes: get("notes") || null,
    };
    const f = fd.get("chartImage");
    chartFile = f instanceof File && f.size > 0 ? f : null;
  } else {
    payload = await req.json();
  }

  const ticker = sanitizeString(payload.ticker, MAX_TICKER_LENGTH).toUpperCase();
  const strategy = payload.strategy
    ? sanitizeString(payload.strategy, MAX_STRATEGY_LENGTH)
    : null;
  const positionType = String(payload.positionType ?? "");
  const optionType = payload.optionType ? String(payload.optionType) : null;
  const strike = payload.strike ? Number(payload.strike) : null;
  const expiry = payload.expiry ? new Date(String(payload.expiry)) : null;
  const entryDate = String(payload.entryDate ?? "");
  const entryTime = payload.entryTime ? String(payload.entryTime) : null;
  const sellDate = payload.sellDate ? String(payload.sellDate) : null;
  const exitTime = payload.exitTime ? String(payload.exitTime) : null;
  const notes = payload.notes
    ? sanitizeString(payload.notes, MAX_NOTES_LENGTH)
    : null;

  if (!ticker)
    return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
  if (!/^[A-Z0-9./-]+$/.test(ticker))
    return NextResponse.json({ error: "Invalid ticker format" }, { status: 400 });
  if (!["LONG", "SHORT"].includes(positionType))
    return NextResponse.json({ error: "Position type must be LONG or SHORT" }, { status: 400 });

  const parsedEntry = new Date(entryDate);
  if (isNaN(parsedEntry.getTime()))
    return NextResponse.json({ error: "Invalid entry date" }, { status: 400 });

  let parsedSell: Date | null = null;
  if (sellDate) {
    parsedSell = new Date(sellDate);
    if (isNaN(parsedSell.getTime()))
      return NextResponse.json({ error: "Invalid sell date" }, { status: 400 });
  }

  if (chartFile) {
    if (chartFile.size > MAX_IMAGE_SIZE)
      return NextResponse.json({ error: "Image too large (5 MB max)" }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(chartFile.type))
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
  }

  const buys = parseFills(payload.buyFills);
  const sells = parseFills(payload.sellFills);
  const avgBuy = weightedAvg(buys);
  const avgSell = weightedAvg(sells);
  const totalBuyQty = buys.reduce((s, f) => s + f.qty, 0);
  const totalSellQty = sells.reduce((s, f) => s + f.qty, 0);
  const realizedPnl = computeRealizedPnl(buys, sells);

  let outcome: "PROFIT" | "LOSS" | null = null;
  if (realizedPnl > 0) outcome = "PROFIT";
  else if (realizedPnl < 0) outcome = "LOSS";

  try {
    let trade = await prisma.tradeEntry.create({
      data: {
        userId,
        ticker,
        strategy,
        positionType,
        optionType: optionType && ["CALL", "PUT"].includes(optionType) ? optionType : null,
        strike: strike && Number.isFinite(strike) ? strike : null,
        expiry: expiry && !isNaN(expiry.getTime()) ? expiry : null,
        entryDate: parsedEntry,
        entryTime,
        sellDate: parsedSell,
        exitTime,
        buyFills: buys.length ? buys : undefined,
        sellFills: sells.length ? sells : undefined,
        totalBuyQty,
        totalSellQty,
        avgBuyPrice: avgBuy,
        avgSellPrice: avgSell,
        realizedPnl,
        outcome,
        notes,
      },
    });

    if (chartFile && process.env.S3_BUCKET_NAME) {
      const bytes = Buffer.from(await chartFile.arrayBuffer());
      const ext = (chartFile.type.split("/")[1] || "png").toLowerCase();
      const key = `users/${userId}/charts/${trade.id}-${crypto.randomUUID()}.${ext}`;

      const url = await putPublicObject({
        bucket: process.env.S3_BUCKET_NAME,
        key,
        contentType: chartFile.type,
        body: bytes,
      });

      trade = await prisma.tradeEntry.update({
        where: { id: trade.id },
        data: { chartUrl: url },
      });
    }

    return NextResponse.json(trade, { status: 201 });
  } catch (err) {
    console.error("POST /api/trades error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const tradeId = searchParams.get("id");
    const clearAll = searchParams.get("all");

    if (clearAll === "true") {
      const result = await prisma.tradeEntry.deleteMany({ where: { userId } });
      return NextResponse.json({ message: "Deleted", count: result.count });
    }

    if (!tradeId)
      return NextResponse.json({ error: "Trade ID required" }, { status: 400 });

    const trade = await prisma.tradeEntry.findUnique({
      where: { id: tradeId },
    });
    if (!trade || trade.userId !== userId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.tradeEntry.delete({ where: { id: tradeId } });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /api/trades error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
