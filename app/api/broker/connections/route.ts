import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getSnapTrade } from "@/lib/snaptrade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/broker/connections
 * Returns the user's linked brokerage accounts (institution name, number, etc.)
 * so the UI can show what's connected and when it last synced.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const conn = await prisma.brokerConnection.findUnique({
      where: { userId },
    });
    if (!conn) {
      return NextResponse.json({ connected: false, accounts: [] });
    }

    const snaptrade = getSnapTrade();
    const res = await snaptrade.accountInformation.listUserAccounts({
      userId,
      userSecret: conn.snaptradeSecret,
    });

    const accounts = (res.data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      number: a.number,
      institution: a.institution_name,
    }));

    return NextResponse.json({
      connected: true,
      lastSyncedAt: conn.lastSyncedAt,
      accounts,
    });
  } catch (err) {
    console.error("GET /api/broker/connections error:", err);
    return NextResponse.json(
      { error: "Could not load broker connections." },
      { status: 500 },
    );
  }
}
