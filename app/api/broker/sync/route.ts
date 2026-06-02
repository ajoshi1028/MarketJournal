import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { rateLimit } from "@/lib/rate-limit";
import { getActivities, mapActivitiesToFills } from "@/lib/snaptrade";
import { buildTradesFromFills } from "@/lib/trade-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/broker/sync
 * Pulls the user's trade activity from their connected brokerage (via
 * SnapTrade), maps it through the shared trade pipeline, de-duplicates against
 * already-synced trades, and inserts the new ones.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // One sync per minute is plenty; brokerage data doesn't change that fast.
  const { success } = await rateLimit(`broker-sync:${userId}`, 3, 60 * 1000);
  if (!success)
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );

  try {
    await ensureUser(userId);

    const conn = await prisma.brokerConnection.findUnique({
      where: { userId },
    });
    if (!conn) {
      return NextResponse.json(
        { error: "No brokerage connected. Connect a broker first." },
        { status: 400 },
      );
    }

    // Pull activities, map to canonical fills, and build trades.
    const activities = await getActivities(userId, conn.snaptradeSecret);
    const fills = mapActivitiesToFills(activities);
    const built = buildTradesFromFills(fills, userId);

    if (!built.length) {
      await prisma.brokerConnection.update({
        where: { userId },
        data: { lastSyncedAt: new Date() },
      });
      return NextResponse.json({ message: "No new trades found.", imported: 0 });
    }

    // De-dupe: skip any trade whose syncHash already exists for this user.
    const hashes = built.map((t) => t.syncHash);
    const existing = await prisma.tradeEntry.findMany({
      where: { userId, syncHash: { in: hashes } },
      select: { syncHash: true },
    });
    const seen = new Set(existing.map((e) => e.syncHash));
    const fresh = built.filter((t) => !seen.has(t.syncHash));

    let imported = 0;
    if (fresh.length) {
      const created = await prisma.tradeEntry.createMany({
        data: fresh.map((t) => ({
          userId: t.userId,
          ticker: t.ticker,
          strategy: t.strategy,
          positionType: t.positionType,
          optionType: t.optionType,
          strike: t.strike,
          expiry: t.expiry,
          entryDate: t.entryDate,
          sellDate: t.sellDate,
          buyFills: t.buyFills,
          sellFills: t.sellFills,
          totalBuyQty: t.totalBuyQty,
          totalSellQty: t.totalSellQty,
          avgBuyPrice: t.avgBuyPrice,
          avgSellPrice: t.avgSellPrice,
          realizedPnl: t.realizedPnl,
          outcome: t.outcome,
          notes: t.notes,
          source: "snaptrade",
          syncHash: t.syncHash,
        })),
        skipDuplicates: true,
      });
      imported = created.count;
    }

    await prisma.brokerConnection.update({
      where: { userId },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({
      message: `Synced ${imported} new trade${imported === 1 ? "" : "s"} from your brokerage.`,
      imported,
      skipped: built.length - fresh.length,
    });
  } catch (err) {
    console.error("POST /api/broker/sync error:", err);
    return NextResponse.json(
      { error: "Broker sync failed. Please try again." },
      { status: 500 },
    );
  }
}
