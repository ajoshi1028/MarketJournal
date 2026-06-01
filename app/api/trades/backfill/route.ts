import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/trades/backfill
 * One-time backfill: parse optionType, strike, and expiry from
 * existing trades' notes/strategy fields (e.g. "QQQ 5/21/2026 Put $712.00").
 * Only updates trades where optionType is currently null.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await rateLimit(`backfill:${userId}`, 3, 60 * 60 * 1000);
  if (!success)
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

  try {
  // Find trades missing optionType
  const trades = await prisma.tradeEntry.findMany({
    where: { userId, optionType: null },
    select: { id: true, notes: true, strategy: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any[] = [];

  for (const t of trades) {
    const desc = t.notes || t.strategy || "";

    const callMatch = /\bCall\b/i.test(desc);
    const putMatch = /\bPut\b/i.test(desc);
    const optionType = callMatch ? "CALL" : putMatch ? "PUT" : null;

    if (!optionType) continue;

    // Parse strike
    let strike: number | null = null;
    const strikeMatch = desc.match(/(?:Call|Put)\s+\$?([\d,]+(?:\.\d+)?)/i);
    if (strikeMatch) {
      strike = parseFloat(strikeMatch[1].replace(/,/g, ""));
      if (!Number.isFinite(strike)) strike = null;
    }

    // Parse expiry
    let expiry: Date | null = null;
    const dateMatch = desc.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) {
      const parts = dateMatch[1].split("/");
      if (parts.length === 3) {
        const [mm, dd, yy] = parts;
        const yyyy = yy.length === 2 ? "20" + yy : yy;
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (!isNaN(+d)) expiry = d;
      }
    }

    updates.push(
      prisma.tradeEntry.update({
        where: { id: t.id },
        data: {
          optionType,
          strike,
          expiry,
          positionType: optionType === "PUT" ? "SHORT" : "LONG",
        },
      }),
    );
  }

  const updated = updates.length;
  if (updated > 0) {
    await prisma.$transaction(updates);
  }

  return NextResponse.json({
    message: `Backfilled ${updated} of ${trades.length} trades with missing option data.`,
    updated,
    total: trades.length,
  });
  } catch (err) {
    console.error("POST /api/trades/backfill error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
