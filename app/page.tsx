import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

/* Faint graph-paper grid — fits a trading product, replaces the blur orbs. */
const gridBg: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
  backgroundSize: "72px 72px",
};

/* ── Inline product previews (pure CSS, no images) ── */

function DashboardPreview() {
  return (
    <div className="bg-surface-100 border border-surface-300 select-none" aria-hidden="true">
      {/* terminal title bar */}
      <div className="flex items-center justify-between border-b border-surface-300 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
          dashboard
        </span>
        <span className="font-mono text-[10px] text-gray-600">/journal</span>
      </div>
      <div className="p-5">
        {/* Stat cards */}
        <div className="grid grid-cols-4 divide-x divide-surface-300 border border-surface-300 mb-4">
          {[
            { label: "Net P&L", value: "+$618.91", color: "text-profit" },
            { label: "Win Rate", value: "49.4%", color: "text-white" },
            { label: "Profit Factor", value: "1.14", color: "text-white" },
            { label: "Loss Streak", value: "1", color: "text-loss" },
          ].map((s) => (
            <div key={s.label} className="p-3">
              <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500 mb-1">{s.label}</p>
              <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3">
          {/* Recent trades */}
          <div className="col-span-3 border border-surface-300 p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">Recent Trades</p>
              <span className="font-mono text-[10px] text-accent-light">log &rarr;</span>
            </div>
            <div className="space-y-2">
              {[
                { ticker: "IWM", detail: "May 25 · Call $286", pnl: "$192.05", loss: true },
                { ticker: "QQQ", detail: "May 21 · Call $717", pnl: "$48.28", loss: true },
                { ticker: "QQQ", detail: "May 21 · Put $712", pnl: "+$119.15", loss: false },
                { ticker: "QQQ", detail: "May 19 · Put $693", pnl: "+$3.68", loss: false },
                { ticker: "QQQ", detail: "May 18 · Put $702", pnl: "+$43.80", loss: false },
              ].map((t, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 ${t.loss ? "bg-loss" : "bg-profit"}`} />
                    <div>
                      <p className="text-[11px] font-semibold text-white font-mono">{t.ticker}</p>
                      <p className="text-[9px] text-gray-500">{t.detail}</p>
                    </div>
                  </div>
                  <p className={`text-[11px] font-mono font-medium ${t.loss ? "text-loss" : "text-profit"}`}>{t.pnl}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Journal */}
          <div className="col-span-2 border border-surface-300 p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400">Journal</p>
              <span className="font-mono text-[10px] text-accent-light">edit &rarr;</span>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500 mb-1">Pre-market plan</p>
            <p className="text-[11px] text-white mb-4">Looking for a Bullish Day!</p>
            <p className="text-[10px] text-accent-light">&rsaquo; post-market review pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  return (
    <div className="bg-surface-100 border border-surface-300 select-none" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-surface-300 px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">analytics</span>
        <span className="font-mono text-[10px] text-gray-600">all trades</span>
      </div>
      <div className="p-5">
        {/* Stat row */}
        <div className="grid grid-cols-5 divide-x divide-surface-300 border border-surface-300 mb-3">
          {[
            { label: "Net P&L", value: "$618.91", color: "text-profit" },
            { label: "Win Rate", value: "49.4%", color: "text-loss" },
            { label: "Profit Fct", value: "1.14", color: "text-white" },
            { label: "Expectancy", value: "$8.04", color: "text-white" },
            { label: "R:R", value: "1:1.17", color: "text-white" },
          ].map((s) => (
            <div key={s.label} className="p-2.5">
              <p className="font-mono text-[8px] uppercase tracking-wider text-gray-500 mb-0.5">{s.label}</p>
              <p className={`text-xs font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-3 divide-x divide-surface-300 border border-surface-300 mb-4">
          {[
            { label: "Current", value: "1L", color: "text-loss" },
            { label: "Best Win", value: "4", color: "text-profit" },
            { label: "Worst Loss", value: "5", color: "text-loss" },
          ].map((s) => (
            <div key={s.label} className="p-2.5 text-center">
              <p className="font-mono text-[8px] uppercase tracking-wider text-gray-500 mb-0.5">{s.label}</p>
              <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* P&L by Day chart mockup */}
        <div className="border border-surface-300 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-400 mb-3">P&L · day of week</p>
          <div className="flex items-end justify-between gap-1 h-20 px-2">
            {[
              { day: "Mon", h: 40, positive: true },
              { day: "Tue", h: 55, positive: true },
              { day: "Wed", h: 35, positive: false },
              { day: "Thu", h: 25, positive: true },
              { day: "Fri", h: 15, positive: true },
            ].map((d) => (
              <div key={d.day} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-full max-w-[28px] ${d.positive ? "bg-profit" : "bg-loss"}`}
                  style={{ height: `${d.h}px` }}
                />
                <span className="font-mono text-[8px] text-gray-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Small reusable label */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gray-500">
      {children}
    </span>
  );
}

export default function HomePage() {
  return (
    <main>
      <SignedOut>
        {/* ── Hero ── */}
        <section className="border-b border-surface-300" style={gridBg}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="pt-24 pb-16 max-w-3xl">
              <div className="flex items-center gap-3 mb-8">
                <span className="h-px w-8 bg-accent-light" />
                <Kicker>Options trading journal · est. 2026</Kicker>
              </div>
              <h1 className="text-[2.75rem] sm:text-6xl md:text-7xl font-light tracking-tight leading-[0.95] text-white mb-8">
                The journal serious
                <br />
                options traders
                <br />
                <span className="italic text-accent-light">actually</span> keep.
              </h1>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-xl mb-10">
                Log every fill. Let AI review your charts. Watch the metrics
                that tell you whether you&apos;re getting better — not just busier.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href="/sign-up"
                  className="group inline-flex items-center gap-2 bg-white text-surface font-medium text-sm px-6 py-3 hover:bg-accent-light transition-colors"
                >
                  Start journaling
                  <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                </Link>
                <span className="font-mono text-xs text-gray-500">
                  free · no card required
                </span>
              </div>
            </div>

            {/* framed preview */}
            <div className="pb-20">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  fig. 01 — your workspace
                </span>
                <span className="h-px flex-1 bg-surface-300" />
              </div>
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* ── Ticker strip ── */}
        <section className="border-b border-surface-300 bg-surface-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-surface-300">
              {[
                { value: "10+", label: "Performance metrics" },
                { value: "2", label: "Broker CSV imports" },
                { value: "AI", label: "Chart & trade analysis" },
                { value: "$0", label: "To get started" },
              ].map((s, i) => (
                <div key={s.label} className={`py-8 ${i % 2 === 0 ? "pr-6" : "px-6"} ${i >= 2 ? "" : ""}`}>
                  <p className="text-3xl md:text-4xl font-mono font-bold text-white mb-2">
                    {s.value}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 01 · Features ── */}
        <section className="border-b border-surface-300">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="grid md:grid-cols-12 gap-x-8 gap-y-12">
              <div className="md:col-span-4">
                <Kicker>01 — Platform</Kicker>
                <h2 className="text-3xl md:text-4xl font-light text-white leading-tight mt-5 tracking-tight">
                  Everything in
                  <br />
                  one workspace
                </h2>
                <p className="text-gray-500 text-base leading-relaxed mt-5 max-w-xs">
                  Purpose-built for options traders who want to improve on
                  purpose, not by accident.
                </p>
              </div>

              {/* feature rows — hairline-ruled, no cards/glows */}
              <div className="md:col-span-8 border-t border-surface-300">
                {[
                  {
                    no: "A",
                    title: "Trade journal",
                    body: "Options-first entry with strike, expiry, multi-leg fills, and chart screenshots. Auto-import via CSV from Robinhood and Webull.",
                    tags: ["Calls & Puts", "Multi-fill", "Chart upload", "CSV import"],
                  },
                  {
                    no: "B",
                    title: "AI coach & chart analysis",
                    body: "Daily reports on your trades — strengths, weaknesses, action items. Upload a chart screenshot and get instant feedback on your entries and exits.",
                    tags: ["Daily reports", "Follow-up Q&A", "Vision analysis"],
                  },
                  {
                    no: "C",
                    title: "Deep analytics",
                    body: "Win rate, profit factor, expectancy, P&L by weekday, ticker and strategy breakdowns, win/loss streaks — recomputed on every trade you log.",
                    tags: ["10+ metrics", "Weekday P&L", "Streaks"],
                  },
                  {
                    no: "D",
                    title: "Calculator, replay & reports",
                    body: "Position-size risk calculator, trade replay against live charts, and downloadable PDF performance reports.",
                    tags: ["Risk calc", "Replay", "PDF export"],
                  },
                ].map((f) => (
                  <div
                    key={f.no}
                    className="grid grid-cols-[auto,1fr] gap-x-6 border-b border-surface-300 py-7 group"
                  >
                    <span className="font-mono text-sm text-gray-600 pt-1 group-hover:text-accent-light transition-colors">
                      {f.no}
                    </span>
                    <div>
                      <h3 className="text-xl font-medium text-white mb-2">{f.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed max-w-lg mb-4">
                        {f.body}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {f.tags.map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[10px] uppercase tracking-wider text-gray-500 border border-surface-300 px-2 py-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 02 · Analytics ── */}
        <section className="border-b border-surface-300 bg-surface-50">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div>
                <Kicker>02 — Analytics</Kicker>
                <h2 className="text-3xl md:text-5xl font-light text-white leading-[1.05] mt-5 mb-6 tracking-tight">
                  See where you
                  <br />
                  make and lose money
                </h2>
                <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-md">
                  Ten-plus metrics across every trade you log — recalculated
                  automatically, no spreadsheets.
                </p>
                <div className="border-t border-surface-300">
                  {[
                    "Win rate, profit factor & expectancy",
                    "P&L breakdown by day of week",
                    "Monthly performance trends",
                    "Ticker & strategy analysis",
                    "Win and loss streaks",
                  ].map((item, i) => (
                    <p
                      key={item}
                      className="flex items-baseline gap-4 border-b border-surface-300 py-3 text-sm text-gray-300"
                    >
                      <span className="font-mono text-xs text-gray-600">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                    fig. 02 — analytics view
                  </span>
                  <span className="h-px flex-1 bg-surface-300" />
                </div>
                <AnalyticsPreview />
              </div>
            </div>
          </div>
        </section>

        {/* ── 03 · Pricing ── */}
        <section className="border-b border-surface-300">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="max-w-2xl mb-14">
              <Kicker>03 — Pricing</Kicker>
              <h2 className="text-3xl md:text-5xl font-light text-white leading-tight mt-5 tracking-tight">
                Start free.
                <br />
                Upgrade when it pays for itself.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 border border-surface-300 divide-y md:divide-y-0 md:divide-x divide-surface-300">
              {/* Free */}
              <div className="p-8 md:p-10">
                <div className="flex items-baseline justify-between mb-6">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400">Free</p>
                  <p className="font-mono text-4xl font-bold text-white">
                    $0<span className="text-base text-gray-500 font-normal">/mo</span>
                  </p>
                </div>
                <div className="border-t border-surface-300">
                  {["10 AI chart analyses", "10 coaching reports", "Basic analytics", "Risk calculator", "Daily journal"].map((item) => (
                    <p key={item} className="flex items-center gap-3 border-b border-surface-300 py-3 text-sm text-gray-300">
                      <span className="font-mono text-gray-600">+</span>
                      {item}
                    </p>
                  ))}
                </div>
                <Link
                  href="/sign-up"
                  className="mt-8 block text-center font-mono text-xs uppercase tracking-[0.2em] text-white border border-surface-400 hover:border-gray-500 px-6 py-3.5 transition-colors"
                >
                  Get started
                </Link>
              </div>

              {/* Pro */}
              <div className="p-8 md:p-10 bg-surface-100">
                <div className="flex items-baseline justify-between mb-6">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-light">Pro</p>
                  <p className="font-mono text-4xl font-bold text-white">
                    $19<span className="text-base text-gray-500 font-normal">/mo</span>
                  </p>
                </div>
                <div className="border-t border-surface-300">
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
                    <p key={item} className="flex items-center gap-3 border-b border-surface-300 py-3 text-sm text-gray-200">
                      <span className="font-mono text-accent-light">+</span>
                      {item}
                    </p>
                  ))}
                </div>
                <Link
                  href="/sign-up"
                  className="mt-8 block text-center font-mono text-xs uppercase tracking-[0.2em] text-surface bg-white hover:bg-accent-light px-6 py-3.5 transition-colors"
                >
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer>
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
              <div>
                <p className="text-white font-semibold text-sm mb-1">
                  <span className="text-accent-light">M</span>arket<span className="text-accent-light">J</span>ournal
                </p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-gray-600">
                  The trading journal for options traders
                </p>
              </div>
              <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-wider text-gray-500">
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
