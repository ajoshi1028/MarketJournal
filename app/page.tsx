import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <SignedOut>
        {/* Hero */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center">
          {/* Gradient mesh background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-accent/[0.07] blur-[120px]" />
            <div className="absolute bottom-[-30%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/[0.05] blur-[100px]" />
            <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-profit/[0.04] blur-[80px]" />
          </div>

          <div className="max-w-7xl mx-auto px-6 pt-20 pb-32 relative">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-accent-light text-sm font-medium tracking-wide uppercase mb-6">
                Options Trading Journal
              </p>
              <h1 className="text-5xl sm:text-6xl md:text-[5.5rem] font-bold tracking-tight text-white leading-[1.05] mb-8">
                Financial infrastructure
                <br />
                <span className="bg-gradient-to-r from-accent-light via-purple-400 to-profit bg-clip-text text-transparent">
                  for smarter trading
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-12 max-w-2xl mx-auto">
                Log trades, analyze charts with AI, get personalized coaching,
                and track performance with deep analytics — all in one platform.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/sign-up"
                  className="bg-accent hover:bg-accent-dark text-white font-semibold px-8 py-4 rounded-full text-sm transition-all hover:shadow-lg hover:shadow-accent/25"
                >
                  Start for free
                  <span className="ml-2 inline-block">&#8594;</span>
                </Link>
                <Link
                  href="/sign-in"
                  className="text-gray-400 hover:text-white text-sm font-medium transition-colors px-6 py-4"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-50/50 to-surface-50 pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 py-20 relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {[
                { value: "10+", label: "Performance metrics tracked" },
                { value: "2", label: "Brokers supported for CSV import" },
                { value: "AI", label: "Powered chart & trade analysis" },
                { value: "$0", label: "To get started, no card required" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento grid — Core features */}
        <section className="bg-surface-50">
          <div className="max-w-6xl mx-auto px-6 py-28">
            <div className="max-w-2xl mb-20">
              <p className="text-accent-light text-sm font-medium tracking-wide uppercase mb-4">
                Platform
              </p>
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-6">
                Everything you need to
                <br />
                trade with an edge
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Purpose-built for options traders who want to improve systematically.
              </p>
            </div>

            {/* Bento grid */}
            <div className="grid md:grid-cols-12 gap-4">
              {/* Large card — Trade Journal */}
              <div className="md:col-span-7 rounded-2xl bg-gradient-to-br from-surface-200 to-surface-100 p-8 md:p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/[0.06] rounded-full blur-[60px] group-hover:bg-accent/[0.1] transition-all duration-700" />
                <div className="relative">
                  <p className="text-accent-light text-xs font-semibold tracking-wider uppercase mb-4">Trade Journal</p>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    Log every trade,<br />capture every detail
                  </h3>
                  <p className="text-gray-400 text-base leading-relaxed max-w-md mb-8">
                    Options-first entry with strike, expiry, multi-leg fills, and chart screenshots. Import automatically via CSV from Robinhood and Webull.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {["Calls & Puts", "Multi-fill", "Chart Upload", "CSV Import"].map((tag) => (
                      <span key={tag} className="text-xs text-gray-400 bg-surface-300/60 px-3 py-1.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right stack */}
              <div className="md:col-span-5 flex flex-col gap-4">
                {/* AI Coaching */}
                <div className="flex-1 rounded-2xl bg-gradient-to-br from-purple-500/[0.08] to-surface-100 p-8 relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/[0.06] rounded-full blur-[50px] group-hover:bg-purple-500/[0.1] transition-all duration-700" />
                  <div className="relative">
                    <p className="text-purple-400 text-xs font-semibold tracking-wider uppercase mb-3">AI Coach</p>
                    <h3 className="text-xl font-bold text-white mb-2">Personalized coaching reports</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Daily analysis of your trades with strengths, weaknesses, and action items. Ask follow-up questions grounded in your data.
                    </p>
                  </div>
                </div>

                {/* Chart Analysis */}
                <div className="flex-1 rounded-2xl bg-gradient-to-br from-profit/[0.06] to-surface-100 p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-profit/[0.05] rounded-full blur-[50px] group-hover:bg-profit/[0.09] transition-all duration-700" />
                  <div className="relative">
                    <p className="text-profit text-xs font-semibold tracking-wider uppercase mb-3">Chart Analysis</p>
                    <h3 className="text-xl font-bold text-white mb-2">AI reads your charts</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Upload a screenshot and get instant feedback on entries, exits, and trade structure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom row — 3 equal cards */}
              <div className="md:col-span-4 rounded-2xl bg-surface-100 p-8 relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/[0.05] rounded-full blur-[40px] group-hover:bg-amber-500/[0.09] transition-all duration-700" />
                <div className="relative">
                  <p className="text-amber-400 text-xs font-semibold tracking-wider uppercase mb-3">Analytics</p>
                  <h3 className="text-lg font-bold text-white mb-2">Deep performance metrics</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Win rate, profit factor, P&L by weekday, ticker breakdown, streaks, and more.
                  </p>
                </div>
              </div>

              <div className="md:col-span-4 rounded-2xl bg-surface-100 p-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/[0.05] rounded-full blur-[40px] group-hover:bg-cyan-500/[0.09] transition-all duration-700" />
                <div className="relative">
                  <p className="text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-3">Daily Journal</p>
                  <h3 className="text-lg font-bold text-white mb-2">Pre-market &amp; post-market</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Game plans, watchlists, mood tracking, self-grading, and lessons learned.
                  </p>
                </div>
              </div>

              <div className="md:col-span-4 rounded-2xl bg-surface-100 p-8 relative overflow-hidden group">
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/[0.05] rounded-full blur-[40px] group-hover:bg-rose-500/[0.09] transition-all duration-700" />
                <div className="relative">
                  <p className="text-rose-400 text-xs font-semibold tracking-wider uppercase mb-3">Tools</p>
                  <h3 className="text-lg font-bold text-white mb-2">Calculator, replay &amp; reports</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Risk calculator, trade replay with live charts, and downloadable PDF reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works — flowing section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[100px]" />
          </div>
          <div className="max-w-6xl mx-auto px-6 py-28 relative">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-6">
                Built for how traders
                <br />
                actually work
              </h2>
            </div>

            <div className="space-y-24">
              {[
                {
                  step: "01",
                  title: "Log your trades",
                  desc: "Enter trades manually or import from your broker via CSV. Every field an options trader needs — strike, expiry, fills, and charts.",
                  align: "left" as const,
                },
                {
                  step: "02",
                  title: "Get AI insights",
                  desc: "Upload chart screenshots for instant analysis. Generate daily coaching reports that cover today, this week, and overall patterns.",
                  align: "right" as const,
                },
                {
                  step: "03",
                  title: "Track and improve",
                  desc: "Deep analytics reveal where you make and lose money. Win rate, profit factor, P&L by weekday, ticker breakdowns, and streaks — all automatic.",
                  align: "left" as const,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`flex flex-col md:flex-row items-start gap-8 max-w-3xl ${
                    item.align === "right" ? "md:ml-auto md:text-right md:flex-row-reverse" : ""
                  }`}
                >
                  <span className="text-6xl md:text-8xl font-bold text-surface-300/60 leading-none shrink-0 select-none">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-lg leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-surface-50 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-accent/[0.04] blur-[100px]" />
          </div>
          <div className="max-w-6xl mx-auto px-6 py-28 relative">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-6">
                Simple, transparent pricing
              </h2>
              <p className="text-gray-400 text-lg">
                Start free. Upgrade when you&apos;re ready.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free */}
              <div className="rounded-2xl bg-surface-100 p-8 md:p-10">
                <p className="text-sm font-medium text-gray-400 mb-1">Free</p>
                <p className="text-5xl font-bold text-white mb-2 tracking-tight">
                  $0
                  <span className="text-lg text-gray-500 font-normal ml-1">/mo</span>
                </p>
                <p className="text-gray-500 text-sm mb-8">Everything to get started</p>
                <div className="space-y-4 mb-10">
                  {["10 AI chart analyses", "10 coaching reports", "Basic analytics", "Risk calculator", "Daily journal"].map((item) => (
                    <p key={item} className="text-sm text-gray-300 flex items-center gap-3">
                      <span className="w-1 h-1 rounded-full bg-gray-500 shrink-0" />
                      {item}
                    </p>
                  ))}
                </div>
                <Link
                  href="/sign-up"
                  className="block text-center text-sm font-semibold text-white bg-surface-300 hover:bg-surface-400 px-6 py-3.5 rounded-full transition-colors"
                >
                  Get started
                </Link>
              </div>

              {/* Pro */}
              <div className="rounded-2xl bg-gradient-to-br from-accent/[0.12] to-surface-100 p-8 md:p-10 ring-1 ring-accent/20">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-sm font-medium text-accent-light">Pro</p>
                  <span className="text-[10px] font-semibold text-accent-light bg-accent/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Popular
                  </span>
                </div>
                <p className="text-5xl font-bold text-white mb-2 tracking-tight">
                  $19
                  <span className="text-lg text-gray-500 font-normal ml-1">/mo</span>
                </p>
                <p className="text-gray-500 text-sm mb-8">For serious traders</p>
                <div className="space-y-4 mb-10">
                  {[
                    "Unlimited trades",
                    "Unlimited AI analysis",
                    "Unlimited coaching",
                    "Advanced analytics",
                    "PDF reports",
                    "Trade replay",
                    "CSV broker import",
                    "Priority support",
                  ].map((item) => (
                    <p key={item} className="text-sm text-gray-300 flex items-center gap-3">
                      <span className="w-1 h-1 rounded-full bg-accent-light shrink-0" />
                      {item}
                    </p>
                  ))}
                </div>
                <Link
                  href="/sign-up"
                  className="block text-center text-sm font-semibold text-white bg-accent hover:bg-accent-dark px-6 py-3.5 rounded-full transition-all hover:shadow-lg hover:shadow-accent/25"
                >
                  Start free trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-30%] left-[40%] w-[700px] h-[700px] rounded-full bg-accent/[0.06] blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[20%] w-[400px] h-[400px] rounded-full bg-purple-500/[0.04] blur-[80px]" />
          </div>
          <div className="max-w-4xl mx-auto px-6 py-32 text-center relative">
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.1] mb-6">
              Ready to find your edge?
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
              Join traders using MarketJournal to log, analyze, and improve their performance every day.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center bg-white text-surface font-semibold px-10 py-4 rounded-full text-sm hover:bg-gray-100 transition-all hover:shadow-xl hover:shadow-white/10"
            >
              Start for free
              <span className="ml-2">&#8594;</span>
            </Link>
            <p className="text-gray-600 text-xs mt-6">
              No credit card required.{" "}
              <Link href="/terms" className="underline hover:text-gray-400 transition-colors">Terms</Link>
              {" & "}
              <Link href="/privacy" className="underline hover:text-gray-400 transition-colors">Privacy</Link>
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-surface-300/50">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <p className="text-white font-semibold text-sm mb-1">
                  <span className="text-accent-light">M</span>arket<span className="text-accent-light">J</span>ournal
                </p>
                <p className="text-gray-600 text-xs">
                  The trading journal for options traders.
                </p>
              </div>
              <div className="flex items-center gap-6 text-xs text-gray-500">
                <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
              </div>
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
