import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { putPublicObject } from "@/lib/s3";
import { analyzeTradeChart } from "@/lib/ai";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let trade = await prisma.tradeEntry.findUnique({
    where: { id },
  });
  if (!trade || trade.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let chartUrl = trade.chartUrl ?? null;

  const isMultipart = (req.headers.get("content-type") || "").includes(
    "multipart/form-data",
  );
  if (isMultipart) {
    const fd = await req.formData();
    const f = fd.get("chartImage");
    if (f instanceof File && f.size > 0) {
      if (f.size > MAX_IMAGE_SIZE)
        return NextResponse.json({ error: "Image too large (5 MB max)" }, { status: 400 });
      if (!ALLOWED_IMAGE_TYPES.has(f.type))
        return NextResponse.json({ error: "Invalid image type" }, { status: 400 });

      if (!process.env.S3_BUCKET_NAME)
        return NextResponse.json({ error: "S3 not configured" }, { status: 500 });

      const bytes = Buffer.from(await f.arrayBuffer());
      const ext = (f.type.split("/")[1] || "png").toLowerCase();
      const key = `users/${userId}/charts/${trade.id}-${crypto.randomUUID()}.${ext}`;

      chartUrl = await putPublicObject({
        bucket: process.env.S3_BUCKET_NAME,
        key,
        contentType: f.type,
        body: bytes,
      });

      trade = await prisma.tradeEntry.update({
        where: { id: trade.id },
        data: { chartUrl },
      });
    }
  }

  if (!chartUrl)
    return NextResponse.json(
      { error: "No chart image available. Upload one with this request." },
      { status: 400 },
    );

  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });

  const aiText = await analyzeTradeChart(chartUrl, trade);
  await prisma.tradeEntry.update({
    where: { id: trade.id },
    data: { aiAnalysis: aiText },
  });

  return NextResponse.json({ aiAnalysis: aiText });
}
