"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

type Analytics = {
  overview: {
    totalTrades: number;
    closedTrades: number;
    openTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    riskReward: number;
    expectancy: number;
    profitFactor: number;
    avgHoldDays: number;
    largestWin: number;
    largestLoss: number;
    grossProfit: number;
    grossLoss: number;
    netPnl: number;
  };
  streaks: { current: number; maxWin: number; maxLoss: number };
  byStrategy: { name: string; winRate: number; trades: number; pnl: number }[];
  byTicker: { name: string; winRate: number; trades: number; pnl: number }[];
  byOptionType: { name: string; winRate: number; trades: number; pnl: number }[];
  pnlByWeekday: { name: string; pnl: number; trades: number }[];
  monthlyPerformance: { month: string; pnl: number }[];
};

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#12121a",
    border: "1px solid #2a2a38",
    borderRadius: "0.5rem",
    color: "#e5e7eb",
    fontSize: "0.875rem",
  },
  labelStyle: { color: "#9ca3af" },
  itemStyle: { color: "#e5e7eb" },
};

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/analytics/advanced", {
          cache: "no-store",
        });
        if (res.ok) setData(await res.json());
        else setError("Failed to load analytics.");
      } catch {
        setError("Network error loading analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 text-gray-400">
        Loading analytics...
      </main>
    );
  if (error)
    return (
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="rounded-lg border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm">{error}</div>
      </main>
    );
  if (!data)
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 text-gray-400">
        Failed to load analytics.
      </main>
    );

  const o = data.overview;
  const s = data.streaks;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">
          Analytics
        </h1>
        <p className="text-gray-500 text-sm">
          Performance metrics across all your closed trades.
        </p>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard label="Net P&L" value={fmtUSD(o.netPnl)} color={o.netPnl >= 0 ? "text-profit" : "text-loss"} />
        <StatCard label="Win Rate" value={`${o.winRate.toFixed(1)}%`} color="text-accent-light" />
        <StatCard label="Profit Factor" value={o.profitFactor.toFixed(2)} color="text-white" />
        <StatCard label="Expectancy" value={fmtUSD(o.expectancy)} color={o.expectancy >= 0 ? "text-profit" : "text-loss"} />
        <StatCard label="Risk/Reward" value={`1:${o.riskReward.toFixed(2)}`} color="text-gray-300" />
        <StatCard label="Avg Win" value={fmtUSD(o.avgWin)} color="text-profit" />
        <StatCard label="Avg Loss" value={fmtUSD(o.avgLoss)} color="text-loss" />
        <StatCard label="Largest Win" value={fmtUSD(o.largestWin)} color="text-profit" />
        <StatCard label="Largest Loss" value={fmtUSD(o.largestLoss)} color="text-loss" />
        <StatCard label="Avg Hold" value={`${o.avgHoldDays.toFixed(1)}d`} color="text-gray-300" />
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Current Streak</p>
          <p className={`text-xl font-semibold font-mono ${s.current >= 0 ? "text-profit" : "text-loss"}`}>
            {s.current > 0 ? `${s.current}W` : s.current < 0 ? `${Math.abs(s.current)}L` : "—"}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Best Win Streak</p>
          <p className="text-xl font-semibold font-mono text-profit">{s.maxWin}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Worst Loss Streak</p>
          <p className="text-xl font-semibold font-mono text-loss">{s.maxLoss}</p>
        </div>
      </div>

      {/* P&L by Weekday */}
      <section className="card p-5">
        <h3 className="text-sm font-medium text-white mb-4">
          P&L by Day of Week
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.pnlByWeekday} margin={{ top: 5, right: 10, left: 10, bottom: 0 }} barCategoryGap="25%">
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v}`} width={60} tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [fmtUSD(v), "P&L"]} {...tooltipStyle} cursor={false} />
              <ReferenceLine y={0} stroke="#2a2a38" strokeWidth={1} />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]} maxBarSize={48}>
                {data.pnlByWeekday.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? "#34d399" : "#f87171"} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Monthly Performance */}
      <section className="card p-5">
        <h3 className="text-sm font-medium text-white mb-4">
          Monthly Performance
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyPerformance} margin={{ top: 5, right: 10, left: 10, bottom: 0 }} barCategoryGap="20%">
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v}`} width={60} tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [fmtUSD(v), "P&L"]} {...tooltipStyle} cursor={false} />
              <ReferenceLine y={0} stroke="#2a2a38" strokeWidth={1} />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]} maxBarSize={64}>
                {data.monthlyPerformance.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? "#34d399" : "#f87171"} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Call vs Put */}
      <section className="card p-5">
        <h3 className="text-sm font-medium text-white mb-4">
          Call vs Put Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-300 text-gray-500">
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-right py-2 px-4">Trades</th>
                <th className="text-right py-2 px-4">Win Rate</th>
                <th className="text-right py-2 pl-4">P&L</th>
              </tr>
            </thead>
            <tbody>
              {data.byOptionType.map((ot) => (
                <tr key={ot.name} className="border-b border-surface-200">
                  <td className="py-2.5 pr-4 text-gray-200">{ot.name}</td>
                  <td className="py-2.5 px-4 text-right text-gray-400">{ot.trades}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={ot.winRate >= 50 ? "text-profit" : "text-loss"}>
                      {ot.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`py-2.5 pl-4 text-right font-mono ${ot.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                    {fmtUSD(ot.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* By Ticker table */}
      <section className="card p-5">
        <h3 className="text-sm font-medium text-white mb-4">
          Performance by Ticker
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-300 text-gray-500">
                <th className="text-left py-2 pr-4">Ticker</th>
                <th className="text-right py-2 px-4">Trades</th>
                <th className="text-right py-2 px-4">Win Rate</th>
                <th className="text-right py-2 pl-4">P&L</th>
              </tr>
            </thead>
            <tbody>
              {data.byTicker.map((t) => (
                <tr key={t.name} className="border-b border-surface-200">
                  <td className="py-2.5 pr-4 font-medium text-gray-200">{t.name}</td>
                  <td className="py-2.5 px-4 text-right text-gray-400">{t.trades}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={t.winRate >= 50 ? "text-profit" : "text-loss"}>
                      {t.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`py-2.5 pl-4 text-right font-mono ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                    {fmtUSD(t.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-base font-semibold font-mono tracking-tight ${color}`}>{value}</p>
    </div>
  );
}
