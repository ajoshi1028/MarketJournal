import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import { rateLimit } from "@/lib/rate-limit";
import { registerSnapTradeUser, getConnectionPortalUrl } from "@/lib/snaptrade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/broker/connect
 * Registers the user with SnapTrade (if needed) and returns a one-time hosted
 * connection-portal URL where they link Robinhood / Webull / etc.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await rateLimit(`broker-connect:${userId}`, 10, 60 * 1000);
  if (!success)
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );

  try {
    await ensureUser(userId);

    // Reuse an existing SnapTrade secret, or register a new one.
    let conn = await prisma.brokerConnection.findUnique({ where: { userId } });
    if (!conn) {
      const secret = await registerSnapTradeUser(userId);
      conn = await prisma.brokerConnection.create({
        data: { userId, provider: "snaptrade", snaptradeSecret: secret },
      });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || "";
    const redirectUrl = await getConnectionPortalUrl(
      userId,
      conn.snaptradeSecret,
      origin ? `${origin}/track?connected=1` : undefined,
    );

    return NextResponse.json({ redirectUrl });
  } catch (err) {
    console.error("POST /api/broker/connect error:", err);
    return NextResponse.json(
      { error: "Could not start broker connection. Please try again." },
      { status: 500 },
    );
  }
}
