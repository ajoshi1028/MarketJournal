import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Uploads an object to S3 and returns a public URL.
 * Note: expects S3_BUCKET_NAME and optionally S3_REGION env vars to be set.
 */
async function putPublicObject({
  bucket,
  key,
  contentType,
  body,
}: {
  bucket: string;
  key: string;
  contentType?: string;
  body: Buffer | Uint8Array | Blob | string;
}): Promise<string> {
  const region = process.env.S3_REGION || "us-east-1";
  const client = new S3Client({ region });

  // Ensure body is a Buffer or stream acceptable by AWS SDK
  const payload: any = body instanceof Uint8Array || Buffer.isBuffer(body) ? body : Buffer.from(String(body));

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: payload,
      ACL: "public-read",
      ContentType: contentType || "application/octet-stream",
    })
  );

  // Construct the standard S3 URL for the object
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient({ log: ["warn", "error"] });

type Fill = { qty: number; price: number };

function parseFills(maybeFills: any): Fill[] {
  if (!Array.isArray(maybeFills)) return [];
  return maybeFills
    .map((f) => ({ qty: Number(f?.qty), price: Number(f?.price) }))
    .filter((f) => Number.isFinite(f.qty) && f.qty > 0 && Number.isFinite(f.price) && f.price >= 0);
}

function weightedAvg(fills: Fill[]): number | null {
  const totalQty = fills.reduce((s, f) => s + f.qty, 0);
  if (totalQty === 0) return null;
  const value = fills.reduce((s, f) => s + f.price * f.qty, 0);
  return value / totalQty;
}

function computeRealizedPnl(buys: Fill[], sells: Fill[]): number {
  const buyQty = buys.reduce((s, f) => s + f.qty, 0);
  const sellQty = sells.reduce((s, f) => s + f.qty, 0);
  if (buyQty === 0 || sellQty === 0) return 0;
  const avgBuy = weightedAvg(buys);
  const avgSell = weightedAvg(sells);
  if (avgBuy == null || avgSell == null) return 0;
  const contractsClosed = Math.min(buyQty, sellQty);
  const perContract = (avgSell - avgBuy) * 100;
  return perContract * contractsClosed;
}

async function runAiAnalysisFromUrl(url: string, trade: any): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
You are a trading coach. Analyze the chart for this trade.
Give strengths, weaknesses, and one actionable improvement. ~180 words.

Ticker: ${trade.ticker}
Position: ${trade.positionType}
Strategy: ${trade.strategy ?? "—"}
Entry: ${trade.entryDate?.toISOString?.() ?? trade.entryDate}
Exit: ${trade.sellDate ? (trade.sellDate.toISOString?.() ?? trade.sellDate) : "—"}
Buys: ${trade.totalBuyQty ?? 0} @ ${trade.avgBuyPrice ?? "—"}
Sells: ${trade.totalSellQty ?? 0} @ ${trade.avgSellPrice ?? "—"}
Realized P&L: ${trade.realizedPnl ?? 0}
Outcome: ${trade.outcome ?? "—"}
Notes: ${trade.notes ?? "—"}
`.trim();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url } },
        ],
      },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
}

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const trades = await prisma.tradeEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(trades, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/trades error:", error);
    return NextResponse.json({ error: "Failed to fetch trades", details: error?.message ?? "Unknown" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure user row exists
    const client = await clerkClient();
    const cu = await client.users.getUser(userId).catch(() => null);
    const email = (
      cu?.primaryEmailAddress?.emailAddress ??
      cu?.emailAddresses?.[0]?.emailAddress ??
      `${userId}@placeholder.local`
    ).toLowerCase();
    const name = (cu?.fullName ?? [cu?.firstName, cu?.lastName].filter(Boolean).join(" ")) || null;

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email, name },
    });

    const isMultipart = (req.headers.get("content-type") || "").includes("multipart/form-data");

    let payload: any = {};
    let chartFile: File | null = null;

    if (isMultipart) {
      const fd = await req.formData();
      const get = (k: string) => fd.get(k)?.toString().trim();
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
      chartFile = f instanceof File ? f : null;
    } else {
      payload = await req.json();
    }

    const {
      ticker,
      strategy,
      positionType,
      entryDate,
      sellDate,
      buyFills,
      sellFills,
      notes,
    } = payload ?? {};

    if (!ticker)       return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
    if (!positionType) return NextResponse.json({ error: "Position type is required" }, { status: 400 });
    if (!entryDate)    return NextResponse.json({ error: "Entry date is required" }, { status: 400 });

    const buys = parseFills(buyFills);
    const sells = parseFills(sellFills);

    const avgBuy  = weightedAvg(buys);
    const avgSell = weightedAvg(sells);
    const totalBuyQty  = buys.reduce((s, f) => s + f.qty, 0);
    const totalSellQty = sells.reduce((s, f) => s + f.qty, 0);
    const realizedPnl  = computeRealizedPnl(buys, sells);

    let outcome: "PROFIT" | "LOSS" | null = null;
    if (realizedPnl > 0) outcome = "PROFIT";
    else if (realizedPnl < 0) outcome = "LOSS";

    // Create trade record first
    let trade = await prisma.tradeEntry.create({
      data: {
        userId,
        ticker: String(ticker).trim().toUpperCase(),
        strategy: strategy?.trim() || null,
        positionType,
        entryDate: new Date(entryDate),
        sellDate: sellDate ? new Date(sellDate) : null,
        buyFills: buys.length ? buys : undefined,
        sellFills: sells.length ? sells : undefined,
        totalBuyQty,
        totalSellQty,
        avgBuyPrice:  avgBuy  ?? null,
        avgSellPrice: avgSell ?? null,
        realizedPnl:  realizedPnl || 0,
        outcome,
        notes: notes?.trim() || null,
      },
    });

    // If an image is attached, push to S3 and save URL
    if (chartFile) {
      const bytes = Buffer.from(await chartFile.arrayBuffer());
      const ext = (chartFile.type?.split("/")?.[1] || "png").toLowerCase();
      const key = `users/${userId}/charts/${trade.id}-${crypto.randomUUID()}.${ext}`;

      const url = await putPublicObject({
        bucket: process.env.S3_BUCKET_NAME!,
        key,
        contentType: chartFile.type || "image/png",
        body: bytes,
      });

      trade = await prisma.tradeEntry.update({
        where: { id: trade.id },
        data: { chartUrl: url } as any,
      });

      // Optional: auto-run AI on creation if you want
      if (process.env.OPENAI_API_KEY) {
        try {
          const aiText = await runAiAnalysisFromUrl(url, trade);
          if (aiText) {
            trade = await prisma.tradeEntry.update({
              where: { id: trade.id },
              data: { aiAnalysis: aiText } as any,
            });
          }
        } catch (e) {
          console.warn("AI analyze on create failed:", e);
        }
      }
    }

    return NextResponse.json(trade, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/trades error:", error);
    return NextResponse.json({ error: "Failed to create trade", details: error?.message ?? "Unknown" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tradeId = searchParams.get("id");
    if (!tradeId) return NextResponse.json({ error: "Trade ID required" }, { status: 400 });

    const trade = await prisma.tradeEntry.findUnique({ where: { id: tradeId } });
    if (!trade || trade.userId !== userId) {
      return NextResponse.json({ error: "Trade not found or unauthorized" }, { status: 404 });
    }

    await prisma.tradeEntry.delete({ where: { id: tradeId } });
    return NextResponse.json({ message: "Trade deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE /api/trades error:", error);
    return NextResponse.json({ error: "Failed to delete trade", details: error?.message ?? "Unknown" }, { status: 500 });
  }
}
