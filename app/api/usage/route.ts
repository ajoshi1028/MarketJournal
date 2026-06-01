import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUsageSummary } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const usage = await getUsageSummary(userId);
    if (!usage)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(usage);
  } catch (err) {
    console.error("GET /api/usage error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
