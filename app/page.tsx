import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

const CHECK = (
  <svg className="w-4 h-4 text-accent-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export default function HomePage() {
  return (
    <main>
      <SignedOut>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.03] to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 pt-24 pb-20">
            <div className="max-w-3xl">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] mb-6">
                Journal your trades.
                <br />
                <span className="text-gray-500">Find your edge.</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10 max-w-xl">
                The options trading journal with AI-powered analysis,
                personalized coaching, and deep performance analytics.
              </p>
              <div className="flex items-center gap-4">
                <Link href="/sign-up" className="bg-white text-surface font-semibold px-8 py-3.5 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                  Start for Free
                </Link>
                <Link href="/sign-in" className="text-gray-400 hover:text-white text-sm font-medium transition-colors px-4 py-3.5">
                  Sign In
                </Link>
              </div>
              <p className="text-gray-600 text-xs mt-6">
                No credit card required. By signing up, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-gray-400">Terms</Link> and{" "}
                <Link href="/privacy" className="underline hover:text-gray-400">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Feature showcase — Journal */}
        <section className="border-t border-surface-300">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="max-w-2xl mb-16">
              <p className="text-accent-light text-sm font-medium mb-3">Trade Journal</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5">
                Log every trade,
                <br />
                capture every detail.
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Record option type, strike, fills, entry and exit times, and upload chart screenshots — all in one structured trade log.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: "Options-first", desc: "Built for calls and puts. Strike, expiry, fill prices, and multi-leg support." },
                { title: "Chart snapshots", desc: "Upload screenshots of your chart setups. AI analyzes them on demand." },
                { title: "CSV import", desc: "Bulk import from Robinhood, Webull, and more. No manual entry needed." },
              ].map((f) => (
                <div key={f.title} className="border border-surface-300 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature showcase — AI */}
        <section className="bg-surface-50 border-y border-surface-300">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="max-w-2xl ml-auto text-right mb-16">
              <p className="text-profit text-sm font-medium mb-3">AI Analysis & Coaching</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5">
                Your trading coach,
                <br />
                powered by AI.
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Get daily reports that analyze today&apos;s trades, this week&apos;s performance, and your overall patterns — with specific, actionable feedback.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: "Chart analysis", desc: "Upload a chart and get instant AI feedback on your entries, exits, and trade structure." },
                { title: "Daily coaching", desc: "Personalized reports covering strengths, weaknesses, and concrete action items." },
                { title: "Ask questions", desc: "Ask your coach anything about your trading and get answers grounded in your data." },
              ].map((f) => (
                <div key={f.title} className="border border-surface-300 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature showcase — Analytics */}
        <section className="border-b border-surface-300">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="max-w-2xl mb-16">
              <p className="text-amber-400 text-sm font-medium mb-3">Performance Analytics</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5">
                See where you make
                <br />
                and lose money.
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Win rate, profit factor, P&L by weekday, monthly performance, ticker breakdowns, streaks, and 10+ more metrics across all your trades.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "Win rate & profit factor",
                "P&L by day of week",
                "Monthly performance",
                "Ticker breakdown",
                "Risk/reward ratio",
                "Win & loss streaks",
                "Trade replay",
                "PDF reports",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                  {CHECK}
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tools row */}
        <section className="border-b border-surface-300">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5">
                Everything else you need.
              </h2>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                Daily journal, risk calculator, trade replay with live charts, PDF reports, and more.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {[
                { title: "Daily Journal", desc: "Pre-market plans, post-market review, watchlists, mood tracking, and self-grading." },
                { title: "Risk Calculator", desc: "Calculate position sizes, target P&L, and reward-to-risk before every trade." },
                { title: "Trade Replay", desc: "Review past trades with your chart snapshots alongside live TradingView data." },
                { title: "PDF Reports", desc: "Generate downloadable performance reports with strategy and ticker breakdowns." },
              ].map((f) => (
                <div key={f.title} className="border border-surface-300 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-b border-surface-300">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5">
                Simple pricing.
              </h2>
              <p className="text-gray-400 text-lg">Start free. Upgrade when you need more.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
              <div className="border border-surface-300 rounded-xl p-7">
                <h3 className="text-base font-semibold text-white mb-1">Free</h3>
                <p className="text-gray-500 text-sm mb-5">Get started with the basics</p>
                <p className="text-4xl font-bold text-white mb-6">
                  $0<span className="text-base text-gray-500 font-normal">/mo</span>
                </p>
                <ul className="space-y-3 mb-8">
                  {["10 AI chart analyses", "10 AI coaching reports", "Basic analytics", "Risk calculator", "Daily journal"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-gray-400">
                      {CHECK}
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="block text-center border border-surface-400 text-gray-300 hover:bg-surface-200 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Get Started
                </Link>
              </div>
              <div className="border border-accent/30 rounded-xl p-7 relative">
                <h3 className="text-base font-semibold text-white mb-1">Pro</h3>
                <p className="text-gray-500 text-sm mb-5">For serious traders</p>
                <p className="text-4xl font-bold text-white mb-6">
                  $19<span className="text-base text-gray-500 font-normal">/mo</span>
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Unlimited trades",
                    "Unlimited AI analysis",
                    "Unlimited AI coaching",
                    "Advanced analytics",
                    "PDF reports",
                    "Trade replay",
                    "CSV broker import",
                    "Priority support",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-gray-400">
                      {CHECK}
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="btn-primary block text-center py-2.5">
                  Upgrade
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-surface-300 py-8">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs">MarketJournal</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </SignedOut>

      <SignedIn>
        <Dashboard />
      </SignedIn>
    </main>
  );
}
