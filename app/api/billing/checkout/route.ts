import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe, PLANS } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: PLANS.pro.priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
    metadata: { userId },
  });

  return NextResponse.json({ url: session.url });
}
