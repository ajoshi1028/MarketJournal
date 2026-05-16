"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
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
};

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/analytics/advanced", {
          cache: "no-store",
        });
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
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
  if (!data)
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 text-gray-400">
        Failed to load analytics.
      </main>
    );

  const o = data.overview;
  const s = data.streaks;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">
          Advanced Analytics
        </h1>
        <p className="text-gray-500">
          Deep performance metrics across all your closed trades.
        </p>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard label="Net P&L" value={fmtUSD(o.netPnl)} color={o.netPnl >= 0 ? "text-profit" : "text-loss"} />
        <StatCard label="Win Rate" value={`${o.winRate.toFixed(1)}%`} color="text-accent-light" />
        <StatCard label="Profit Factor" value={o.profitFactor.toFixed(2)} color="text-white" />
        <StatCard label="Expectancy" value={fmtUSD(o.expectancy)} color={o.expectancy >= 0 ? "text-profit" : "text-loss"} />
        <StatCard label="Risk/Reward" value={`1:${o.riskReward.toFixed(2)}`} color="text-amber-400" />
        <StatCard label="Avg Win" value={fmtUSD(o.avgWin)} color="text-profit" />
        <StatCard label="Avg Loss" value={fmtUSD(o.avgLoss)} color="text-loss" />
        <StatCard label="Largest Win" value={fmtUSD(o.largestWin)} color="text-profit" />
        <StatCard label="Largest Loss" value={fmtUSD(o.largestLoss)} color="text-loss" />
        <StatCard label="Avg Hold" value={`${o.avgHoldDays.toFixed(1)}d`} color="text-white" />
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Current Streak</p>
          <p className={`text-2xl font-bold ${s.current >= 0 ? "text-profit" : "text-loss"}`}>
            {s.current > 0 ? `${s.current}W` : s.current < 0 ? `${Math.abs(s.current)}L` : "—"}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Best Win Streak</p>
          <p className="text-2xl font-bold text-profit">{s.maxWin}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Worst Loss Streak</p>
          <p className="text-2xl font-bold text-loss">{s.maxLoss}</p>
        </div>
      </div>

      {/* P&L by Weekday */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          P&L by Day of Week
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.pnlByWeekday} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#2a2a38" }} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v}`} width={65} tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#2a2a38" }} tickLine={false} />
              <Tooltip formatter={(v: number) => [fmtUSD(v), "P&L"]} {...tooltipStyle} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {data.pnlByWeekday.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Monthly Performance */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Monthly Performance
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyPerformance} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#2a2a38" }} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v}`} width={65} tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#2a2a38" }} tickLine={false} />
              <Tooltip formatter={(v: number) => [fmtUSD(v), "P&L"]} {...tooltipStyle} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {data.monthlyPerformance.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* By Strategy table */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Performance by Strategy
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-300 text-gray-500">
                <th className="text-left py-2 pr-4">Strategy</th>
                <th className="text-right py-2 px-4">Trades</th>
                <th className="text-right py-2 px-4">Win Rate</th>
                <th className="text-right py-2 pl-4">P&L</th>
              </tr>
            </thead>
            <tbody>
              {data.byStrategy.map((s) => (
                <tr key={s.name} className="border-b border-surface-200">
                  <td className="py-2.5 pr-4 text-gray-200">{s.name}</td>
                  <td className="py-2.5 px-4 text-right text-gray-400">{s.trades}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={s.winRate >= 50 ? "text-profit" : "text-loss"}>
                      {s.winRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`py-2.5 pl-4 text-right font-mono ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                    {fmtUSD(s.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* By Ticker table */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
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
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}
