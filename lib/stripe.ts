import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export const PLANS = {
  free: { name: "Free", price: 0, tradeLimit: 20, features: ["20 trades/month", "Basic analytics", "Risk calculator"] },
  pro: {
    name: "Pro",
    price: 1999,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: ["Unlimited trades", "Advanced analytics", "AI coaching", "Daily journal", "PDF reports", "Broker sync"],
  },
} as const;
