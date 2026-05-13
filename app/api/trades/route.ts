import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { putPublicObject } from "@/lib/s3";
import { analyzeTradeChart } from "@/lib/ai";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Fill = { qty: number; price: number };

const MAX_TICKER_LENGTH = 10;
const MAX_STRATEGY_LENGTH = 100;
const MAX_NOTES_LENGTH = 2000;
const MAX_FILLS = 50;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function parseFills(raw: unknown): Fill[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_FILLS)
    .map((f) => ({ qty: Number(f?.qty), price: Number(f?.price) }))
    .filter(
      (f) =>
        Number.isFinite(f.qty) &&
        f.qty > 0 &&
        Number.isFinite(f.price) &&
        f.price >= 0,
    );
}

function weightedAvg(fills: Fill[]): number | null {
  const totalQty = fills.reduce((s, f) => s + f.qty, 0);
  if (totalQty === 0) return null;
  return fills.reduce((s, f) => s + f.price * f.qty, 0) / totalQty;
}

function computeRealizedPnl(buys: Fill[], sells: Fill[]): number {
  const buyQty = buys.reduce((s, f) => s + f.qty, 0);
  const sellQty = sells.reduce((s, f) => s + f.qty, 0);
  const avgBuy = weightedAvg(buys);
  const avgSell = weightedAvg(sells);
  if (!avgBuy || !avgSell || buyQty === 0 || sellQty === 0) return 0;
  return (avgSell - avgBuy) * 100 * Math.min(buyQty, sellQty);
}

function sanitizeString(val: unknown, maxLen: number): string {
  return String(val ?? "")
    .trim()
    .slice(0, maxLen);
}

async function ensureUser(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return;

  const client = await clerkClient();
  const cu = await client.users.getUser(userId).catch(() => null);
  const email = (
    cu?.primaryEmailAddress?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    `${userId}@placeholder.local`
  ).toLowerCase();
  const name =
    (cu?.fullName ??
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ")) ||
    null;

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email, name },
  });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trades = await prisma.tradeEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(trades);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      entryDate: get("entryDate"),
      sellDate: get("sellDate") || null,
      buyFills: JSON.parse(get("buyFills") || "[]"),
      sellFills: JSON.parse(get("sellFills") || "[]"),
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
  const entryDate = String(payload.entryDate ?? "");
  const sellDate = payload.sellDate ? String(payload.sellDate) : null;
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

  let trade = await prisma.tradeEntry.create({
    data: {
      userId,
      ticker,
      strategy,
      positionType,
      entryDate: parsedEntry,
      sellDate: parsedSell,
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

    if (process.env.OPENAI_API_KEY) {
      try {
        const aiText = await analyzeTradeChart(url, trade);
        if (aiText) {
          trade = await prisma.tradeEntry.update({
            where: { id: trade.id },
            data: { aiAnalysis: aiText },
          });
        }
      } catch (e) {
        console.warn("AI analysis on create failed:", e);
      }
    }
  }

  return NextResponse.json(trade, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tradeId = searchParams.get("id");
  if (!tradeId)
    return NextResponse.json({ error: "Trade ID required" }, { status: 400 });

  const trade = await prisma.tradeEntry.findUnique({
    where: { id: tradeId },
  });
  if (!trade || trade.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.tradeEntry.delete({ where: { id: tradeId } });
  return NextResponse.json({ message: "Deleted" });
}
