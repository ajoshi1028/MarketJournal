import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

/** @deprecated Use getStripe() instead */
export const stripe = undefined as unknown as Stripe;

export const PLANS = {
  free: { name: "Free", price: 0, tradeLimit: 20, features: ["20 trades/month", "Basic analytics", "Risk calculator"] },
  pro: {
    name: "Pro",
    price: 1999,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: ["Unlimited trades", "Advanced analytics", "AI coaching", "Daily journal", "PDF reports", "Broker sync"],
  },
} as const;
