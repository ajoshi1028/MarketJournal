import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { putPublicObject } from "../../../../../lib/s3";
import crypto from "crypto";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function runAi(url: string, trade: any) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const prompt = `
Analyze this trade's chart. Give strengths, weaknesses, and one improvement. ~180 words.

Ticker: ${trade.ticker}
Position: ${trade.positionType}
Strategy: ${trade.strategy ?? "—"}
Entry: ${trade.entryDate?.toISOString?.() ?? trade.entryDate}
Exit: ${trade.sellDate ? (trade.sellDate.toISOString?.() ?? trade.sellDate) : "—"}
P&L: ${trade.realizedPnl ?? 0}
Outcome: ${trade.outcome ?? "—"}
Notes: ${trade.notes ?? "—"}
`.trim();

  const resp = await client.chat.completions.create({
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

  return resp.choices?.[0]?.message?.content?.trim() || "";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let trade = await prisma.tradeEntry.findUnique({ where: { id: params.id } });
    if (!trade || trade.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let chartUrl = trade.chartUrl ?? null;

    // Accept optional new file on re-analyze
    const isMultipart = (req.headers.get("content-type") || "").includes("multipart/form-data");
    if (isMultipart) {
      const fd = await req.formData();
      const f = fd.get("chartImage");
      if (f instanceof File) {
        const bytes = Buffer.from(await f.arrayBuffer());
        const ext = (f.type?.split("/")?.[1] || "png").toLowerCase();
        const key = `users/${userId}/charts/${trade.id}-${crypto.randomUUID()}.${ext}`;
        chartUrl = await putPublicObject({
          bucket: process.env.S3_BUCKET_NAME!,
          key,
          contentType: f.type || "image/png",
          body: bytes,
        });
        trade = await prisma.tradeEntry.update({
          where: { id: trade.id },
          data: { chartUrl },
        });
      }
    }

    if (!chartUrl) {
      return NextResponse.json(
        { error: "No chart image available. Upload one with this request." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }

    const aiText = await runAi(chartUrl, trade);
    await prisma.tradeEntry.update({
      where: { id: trade.id },
      data: { aiAnalysis: aiText },
    });

    return NextResponse.json({ aiAnalysis: aiText }, { status: 200 });
  } catch (e: any) {
    console.error("Analyze failed", e);
    return NextResponse.json({ error: "Analyze failed", details: e?.message }, { status: 500 });
  }
}
