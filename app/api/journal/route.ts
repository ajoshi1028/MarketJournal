import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  try {
    if (dateStr) {
      const d = new Date(dateStr + "T00:00:00.000Z");
      if (isNaN(d.getTime()))
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });

      const entry = await prisma.journal.findUnique({
        where: { userId_date: { userId, date: d } },
      });
      return NextResponse.json(entry);
    }

    const limit = Math.min(Number(searchParams.get("limit")) || 30, 500);
    const entries = await prisma.journal.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: limit,
    });
    return NextResponse.json(entries);
  } catch (err) {
    console.error("GET /api/journal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await rateLimit(`journal:${userId}`, 30, 60 * 1000);
  if (!success)
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  const body = await req.json();
  const dateStr = String(body.date ?? "");
  const d = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(d.getTime()))
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const data = {
    premarketPlan: body.premarketPlan?.slice(0, 5000) || null,
    watchlist: Array.isArray(body.watchlist)
      ? body.watchlist.map((s: unknown) => String(s).toUpperCase().trim()).filter(Boolean).slice(0, 20)
      : [],
    marketBias: ["bullish", "bearish", "neutral"].includes(body.marketBias)
      ? body.marketBias
      : null,
    keyLevels: body.keyLevels?.slice(0, 3000) || null,
    postReview: body.postReview?.slice(0, 5000) || null,
    lessonsLearned: body.lessonsLearned?.slice(0, 3000) || null,
    mood: typeof body.mood === "number" ? Math.min(5, Math.max(1, Math.round(body.mood))) : null,
    confidence: typeof body.confidence === "number" ? Math.min(5, Math.max(1, Math.round(body.confidence))) : null,
    grade: ["A", "B", "C", "D", "F"].includes(body.grade) ? body.grade : null,
  };

  try {
    const entry = await prisma.journal.upsert({
      where: { userId_date: { userId, date: d } },
      update: data,
      create: { userId, date: d, ...data },
    });

    return NextResponse.json(entry);
  } catch (err) {
    console.error("POST /api/journal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
