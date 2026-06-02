"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Trade {
  id: string;
  ticker: string;
  optionType: string | null;
  strike: number | null;
  realizedPnl: number | null;
  outcome: string | null;
  entryDate: string;
  strategy: string | null;
}

interface Stats {
  totalTrades: number;
  winRate: number;
  netPnl: number;
  bestStreak: number;
  currentStreak: number;
  avgWin: number;
  avgLoss: number;
  topTicker: string | null;
  profitFactor: number;
}

interface JournalEntry {
  id: string;
  date: string;
  premarketPlan: string | null;
  postReview: string | null;
  grade: string | null;
  mood: string | null;
}

interface DashboardData {
  trades: Trade[];
  stats: Stats | null;
  journal: JournalEntry | null;
  coachingDates: string[];
  balance: number;
  isPro: boolean;
}

const emptyStats: Stats = {
  totalTrades: 0,
  winRate: 0,
  netPnl: 0,
  bestStreak: 0,
  currentStreak: 0,
  avgWin: 0,
  avgLoss: 0,
  topTicker: null,
  profitFactor: 0,
};

function formatPnl(val: number) {
  const sign = val >= 0 ? "+" : "";
  return `${sign}$${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(val: number) {
  return `${val.toFixed(1)}%`;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tradesRes, advancedRes, journalRes, coachingRes, accountRes, usageRes] =
          await Promise.allSettled([
            fetch("/api/trades"),
            fetch("/api/account/analytics/advanced"),
            fetch(`/api/journal?date=${new Date().toISOString().slice(0, 10)}`),
            fetch("/api/ai/coaching"),
            fetch("/api/account"),
            fetch("/api/usage", { cache: "no-store" }),
          ]);

        const trades: Trade[] =
          tradesRes.status === "fulfilled" && tradesRes.value.ok
            ? await tradesRes.value.json()
            : [];

        let stats: Stats | null = null;
        if (advancedRes.status === "fulfilled" && advancedRes.value.ok) {
          const adv = await advancedRes.value.json();
          const o = adv.overview || {};
          const topTicker =
            adv.byTicker?.length > 0
              ? adv.byTicker.sort((a: { pnl: number }, b: { pnl: number }) => b.pnl - a.pnl)[0]
                  .name
              : null;
          stats = {
            totalTrades: o.totalTrades ?? 0,
            winRate: o.winRate ?? 0,
            netPnl: o.netPnl ?? 0,
            bestStreak: adv.streaks?.maxWin ?? 0,
            currentStreak: adv.streaks?.current ?? 0,
            avgWin: o.avgWin ?? 0,
            avgLoss: o.avgLoss ?? 0,
            topTicker,
            profitFactor: o.profitFactor ?? 0,
          };
        }

        let journal: JournalEntry | null = null;
        if (journalRes.status === "fulfilled" && journalRes.value.ok) {
          const jData = await journalRes.value.json();
          journal = Array.isArray(jData) ? jData[0] ?? null : jData;
        }

        let coachingDates: string[] = [];
        if (coachingRes.status === "fulfilled" && coachingRes.value.ok) {
          const cData = await coachingRes.value.json();
          coachingDates = Array.isArray(cData) ? cData.map((c: { date: string }) => c.date) : [];
        }

        let balance = 0;
        if (accountRes.status === "fulfilled" && accountRes.value.ok) {
          const aData = await accountRes.value.json();
          balance = aData.balance ?? 0;
        }

        let isPro = false;
        if (usageRes.status === "fulfilled" && usageRes.value.ok) {
          const uData = await usageRes.value.json();
          isPro = uData.isPro === true;
        }

        setData({ trades, stats: stats ?? emptyStats, journal, coachingDates, balance, isPro });
      } catch {
        setData({ trades: [], stats: emptyStats, journal: null, coachingDates: [], balance: 0, isPro: false });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-surface-200 w-48" />
          <div className="grid grid-cols-4 border border-surface-300 divide-x divide-surface-300">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-surface-200" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-64 bg-surface-200" />
            <div className="h-64 bg-surface-200" />
          </div>
        </div>
      </div>
    );
  }

  const { trades, stats, journal, coachingDates, balance, isPro } = data!;
  const s = stats ?? emptyStats;
  const recentTrades = trades.slice(0, 5);
  const today = new Date().toISOString().slice(0, 10);
  const hasCoachingToday = coachingDates.some((d) => d.startsWith(today));
  const totalCoachingReports = coachingDates.length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between border-b border-surface-300 pb-6">
        <div>
          <p className="kicker mb-3">Workspace</p>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white">Dashboard</h1>
          <p className="font-mono text-xs text-gray-500 mt-3">
            {s.totalTrades > 0
              ? `${s.totalTrades} trades logged · ${formatPercent(s.winRate)} win rate`
              : "Start logging trades to see your stats here."}
          </p>
        </div>
        {balance > 0 && (
          <Link href="/account" className="text-right group">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 group-hover:text-gray-400 transition-colors mb-1">Account balance</p>
            <p className="text-lg font-mono font-bold text-white">
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-surface-300 divide-x divide-y sm:divide-y-0 divide-surface-300 mb-6">
        {[
          { label: "Net P&L", value: s.totalTrades > 0 ? formatPnl(s.netPnl) : "—", color: s.netPnl >= 0 ? "text-profit" : "text-loss" },
          { label: "Win Rate", value: s.totalTrades > 0 ? formatPercent(s.winRate) : "—", color: "text-white" },
          { label: "Profit Factor", value: s.totalTrades > 0 && s.profitFactor > 0 ? s.profitFactor.toFixed(2) : "—", color: "text-white" },
          { label: s.currentStreak >= 0 ? "Win Streak" : "Loss Streak", value: s.totalTrades > 0 ? `${Math.abs(s.currentStreak)}` : "—", color: s.currentStreak >= 0 ? "text-profit" : "text-loss" },
        ].map((stat) => (
          <Link key={stat.label} href="/analytics" className="px-4 py-4 hover:bg-surface-200/40 transition-colors">
            <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">{stat.label}</p>
            <p className={`text-xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Recent trades */}
        <div className="card">
          <div className="panel-head">
            <span>Recent Trades</span>
            <Link href="/trades" className="text-accent-light hover:text-accent transition-colors normal-case tracking-normal">
              log →
            </Link>
          </div>
          {recentTrades.length > 0 ? (
            <div className="divide-y divide-surface-300">
              {recentTrades.map((t) => (
                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-1.5 h-1.5 shrink-0 ${
                        t.outcome === "PROFIT" ? "bg-profit" : t.outcome === "LOSS" ? "bg-loss" : "bg-gray-600"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {t.ticker}
                        {t.optionType && t.strike && (
                          <span className="text-gray-500 font-normal">
                            {" "}
                            {t.strike} {t.optionType}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(t.entryDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {t.strategy && ` · ${t.strategy}`}
                      </p>
                    </div>
                  </div>
                  {t.realizedPnl != null && (
                    <p
                      className={`text-sm font-medium tabular-nums shrink-0 ${
                        t.realizedPnl >= 0 ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatPnl(t.realizedPnl)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 pb-4 pt-2">
              <p className="text-sm text-gray-600">No trades yet.</p>
              <Link href="/trades" className="text-sm text-accent-light hover:underline mt-1 inline-block">
                Log your first trade →
              </Link>
            </div>
          )}
          {recentTrades.length > 0 && (
            <div className="px-4 py-2.5 border-t border-surface-300">
              <Link href="/track" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                View all trades →
              </Link>
            </div>
          )}
        </div>

        {/* Today's journal */}
        <div className="card">
          <div className="panel-head">
            <span>Today&apos;s Journal</span>
            <Link href="/journal" className="text-accent-light hover:text-accent transition-colors normal-case tracking-normal">
              {journal ? "edit →" : "write →"}
            </Link>
          </div>
          <div className="px-4 py-4">
            {journal ? (
              <div className="space-y-3">
                {journal.premarketPlan && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Pre-market plan</p>
                    <p className="text-sm text-gray-300 line-clamp-2">{journal.premarketPlan}</p>
                  </div>
                )}
                {journal.postReview && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Post-market review</p>
                    <p className="text-sm text-gray-300 line-clamp-2">{journal.postReview}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 pt-1">
                  {journal.grade && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Grade</span>
                      <span
                        className={`text-sm font-semibold ${
                          journal.grade === "A"
                            ? "text-profit"
                            : journal.grade === "F"
                              ? "text-loss"
                              : "text-white"
                        }`}
                      >
                        {journal.grade}
                      </span>
                    </div>
                  )}
                  {journal.mood && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Mood</span>
                      <span className="text-sm text-white">{journal.mood}</span>
                    </div>
                  )}
                </div>
                {!journal.postReview && (
                  <p className="text-xs text-amber-400/80 mt-1">
                    Don&apos;t forget your post-market review today.
                  </p>
                )}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-gray-600 text-sm mb-2">No journal entry for today.</p>
                <Link href="/journal" className="text-sm text-accent-light hover:underline">
                  Write your pre-market plan →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tools & Features */}
      <div className="mb-3 mt-2 flex items-center gap-3">
        <span className="kicker">Tools</span>
        <span className="h-px flex-1 bg-surface-300" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-surface-300">
        {[
          {
            href: "/coaching",
            no: "01",
            title: "AI Coach",
            desc: hasCoachingToday
              ? "Today's report is ready"
              : totalCoachingReports > 0
                ? `${totalCoachingReports} report${totalCoachingReports !== 1 ? "s" : ""} generated · get today's`
                : "Personalized coaching from your trades",
            cta: "open coach",
            accent: hasCoachingToday,
          },
          {
            href: "/replay",
            no: "02",
            title: "Trade Replay",
            desc: s.totalTrades > 0 ? `Review ${s.totalTrades} trades with live charts` : "Replay trades with TradingView charts",
            cta: "launch replay",
          },
          {
            href: "/calculator",
            no: "03",
            title: "Risk Calculator",
            desc: "Position sizing & risk-reward ratios",
            cta: "calculate",
          },
          {
            href: "/reports",
            no: "04",
            title: "PDF Reports",
            desc: "Downloadable trade reports",
            cta: "generate",
          },
          {
            href: "/trades",
            no: "05",
            title: "CSV Import",
            desc: "Sync trades from your broker",
            cta: "import",
          },
          {
            href: "/billing",
            no: "06",
            title: "Billing",
            desc: isPro ? "Pro plan active" : "Free plan · upgrade",
            cta: "manage",
          },
        ].map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group border-b border-r border-surface-300 p-5 hover:bg-surface-200/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-gray-600 group-hover:text-accent-light transition-colors">{tool.no}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-gray-600 group-hover:text-gray-400 transition-colors">
                {tool.cta} →
              </span>
            </div>
            <h3 className="text-base font-medium text-white mb-1">{tool.title}</h3>
            <p className={`text-sm ${tool.accent ? "text-profit" : "text-gray-500"}`}>{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
