"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const FREE_FEATURES = [
  "20 trades per month",
  "Basic analytics",
  "Risk calculator",
  "P&L calendar",
];

const PRO_FEATURES = [
  "Unlimited trades",
  "Advanced analytics",
  "AI trade coaching",
  "Daily journal",
  "PDF reports",
  "Broker CSV import",
  "Trade replay",
  "Priority support",
];

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed to create checkout session");
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Failed to open billing portal");
    } catch {
      alert("Network error");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Billing</h1>
        <p className="text-gray-500 text-sm">
          Choose the plan that fits your trading.
        </p>
      </div>

      {success && (
        <div className="mb-6 rounded-lg border border-profit/30 bg-profit-muted px-4 py-3 text-profit text-sm">
          Subscription activated! You now have access to all Pro features.
        </div>
      )}
      {canceled && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-400 text-sm">
          Checkout was canceled. No charges were made.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <div className="card p-6 relative">
          <h2 className="text-lg font-bold text-white mb-1">Free</h2>
          <p className="text-3xl font-bold text-white mb-1">
            $0<span className="text-sm font-normal text-gray-500">/month</span>
          </p>
          <p className="text-sm text-gray-500 mb-5">
            Get started with the basics
          </p>
          <ul className="space-y-2.5 mb-6">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <div className="text-sm text-gray-600">Current free tier</div>
        </div>

        {/* Pro */}
        <div className="card p-6 relative border-accent/40 shadow-glow">
          <div className="absolute -top-3 left-6 bg-accent px-3 py-1 rounded-full text-xs font-bold text-white">
            POPULAR
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Pro</h2>
          <p className="text-3xl font-bold text-white mb-1">
            $19.99
            <span className="text-sm font-normal text-gray-500">/month</span>
          </p>
          <p className="text-sm text-gray-500 mb-5">
            Everything you need to trade smarter
          </p>
          <ul className="space-y-2.5 mb-6">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-accent-light shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Loading..." : "Upgrade to Pro"}
          </button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handlePortal}
          disabled={portalLoading}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          {portalLoading ? "Loading..." : "Manage existing subscription →"}
        </button>
      </div>
    </main>
  );
}
