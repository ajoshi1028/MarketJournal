import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as { id: string } | null)?.id ?? null;

        if (userId && subscriptionId) {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionId,
                subscriptionStatus: "active",
                subscriptionPlan: "pro",
              },
            });
          } else if (session.customer) {
            const customerId = typeof session.customer === "string"
              ? session.customer
              : (session.customer as { id: string }).id;
            const userByCustomer = await prisma.user.findFirst({
              where: { stripeCustomerId: customerId },
            });
            if (userByCustomer) {
              await prisma.user.update({
                where: { id: userByCustomer.id },
                data: {
                  subscriptionId,
                  subscriptionStatus: "active",
                  subscriptionPlan: "pro",
                },
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string"
          ? sub.customer
          : (sub.customer as { id: string }).id;
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (user) {
          const periodEnd = (sub as unknown as Record<string, unknown>).current_period_end as number | undefined;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: sub.status,
              subscriptionEndDate: periodEnd
                ? new Date(periodEnd * 1000)
                : null,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string"
          ? sub.customer
          : (sub.customer as { id: string }).id;
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: "canceled",
              subscriptionPlan: "free",
              subscriptionId: null,
            },
          });
        }
        break;
      }
    }
  } catch {
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
