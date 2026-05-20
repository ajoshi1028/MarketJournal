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
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-surface-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-surface-200 rounded-xl" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-64 bg-surface-200 rounded-xl" />
            <div className="h-64 bg-surface-200 rounded-xl" />
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
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            {s.totalTrades > 0
              ? `${s.totalTrades} trades logged · ${formatPercent(s.winRate)} win rate`
              : "Start logging trades to see your stats here."}
          </p>
        </div>
        {balance > 0 && (
          <Link href="/account" className="text-right group">
            <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Account balance</p>
            <p className="text-lg font-semibold text-white">
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link href="/analytics" className="card px-4 py-3.5 hover:border-surface-400 transition-colors">
          <p className="text-xs text-gray-500 mb-1">Net P&L</p>
          <p className={`text-xl font-semibold ${s.netPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {s.totalTrades > 0 ? formatPnl(s.netPnl) : "—"}
          </p>
        </Link>
        <Link href="/analytics" className="card px-4 py-3.5 hover:border-surface-400 transition-colors">
          <p className="text-xs text-gray-500 mb-1">Win Rate</p>
          <p className="text-xl font-semibold text-white">
            {s.totalTrades > 0 ? formatPercent(s.winRate) : "—"}
          </p>
        </Link>
        <Link href="/analytics" className="card px-4 py-3.5 hover:border-surface-400 transition-colors">
          <p className="text-xs text-gray-500 mb-1">Profit Factor</p>
          <p className="text-xl font-semibold text-white">
            {s.totalTrades > 0 && s.profitFactor > 0 ? s.profitFactor.toFixed(2) : "—"}
          </p>
        </Link>
        <Link href="/analytics" className="card px-4 py-3.5 hover:border-surface-400 transition-colors">
          <p className="text-xs text-gray-500 mb-1">
            {s.currentStreak >= 0 ? "Win Streak" : "Loss Streak"}
          </p>
          <p className={`text-xl font-semibold ${s.currentStreak >= 0 ? "text-profit" : "text-loss"}`}>
            {s.totalTrades > 0 ? `${Math.abs(s.currentStreak)}` : "—"}
          </p>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Recent trades */}
        <div className="card">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Recent Trades</h2>
            <Link href="/trades" className="text-xs text-accent-light hover:underline">
              Log trade →
            </Link>
          </div>
          {recentTrades.length > 0 ? (
            <div className="divide-y divide-surface-300">
              {recentTrades.map((t) => (
                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
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
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Today&apos;s Journal</h2>
            <Link href="/journal" className="text-xs text-accent-light hover:underline">
              {journal ? "Edit →" : "Write →"}
            </Link>
          </div>
          <div className="px-4 pb-4">
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

      {/* Bottom row */}
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        {/* AI Coach */}
        <Link href="/coaching" className="card px-4 py-4 hover:border-surface-400 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent-light">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-white">AI Coach</h2>
          </div>
          {hasCoachingToday ? (
            <p className="text-xs text-profit">Today&apos;s report is ready</p>
          ) : totalCoachingReports > 0 ? (
            <p className="text-xs text-gray-500">
              {totalCoachingReports} report{totalCoachingReports !== 1 && "s"} generated · Get today&apos;s
            </p>
          ) : (
            <p className="text-xs text-gray-500">Get personalized coaching based on your trades</p>
          )}
        </Link>

        {/* Trade Replay */}
        <Link href="/replay" className="card px-4 py-4 hover:border-surface-400 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent-light">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-white">Trade Replay</h2>
          </div>
          <p className="text-xs text-gray-500">
            {s.totalTrades > 0
              ? `Review ${s.totalTrades} trades with live charts`
              : "Replay trades with live TradingView charts"}
          </p>
        </Link>

        {/* Risk Calculator */}
        <Link href="/calculator" className="card px-4 py-4 hover:border-surface-400 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent-light">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-white">Risk Calculator</h2>
          </div>
          <p className="text-xs text-gray-500">Position sizing & risk-reward ratios</p>
        </Link>
      </div>

      {/* Quick links row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/reports" className="card px-4 py-4 hover:border-surface-400 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent-light">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-white">PDF Reports</h2>
          </div>
          <p className="text-xs text-gray-500">Generate downloadable trade reports</p>
        </Link>

        <Link href="/sync" className="card px-4 py-4 hover:border-surface-400 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent-light">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-white">CSV Import</h2>
          </div>
          <p className="text-xs text-gray-500">Sync trades from your broker</p>
        </Link>

        <Link href="/billing" className="card px-4 py-4 hover:border-surface-400 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent-light">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h2 className="text-sm font-medium text-white">Billing</h2>
          </div>
          <p className="text-xs text-gray-500">
            {isPro ? "Pro plan active" : "Free plan · Upgrade for unlimited"}
          </p>
        </Link>
      </div>
    </div>
  );
}
