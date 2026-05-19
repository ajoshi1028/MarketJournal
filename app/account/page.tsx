"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import ImportTrades from "./ImportTrades";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Trade = {
  id: string;
  ticker: string;
  strategy: string | null;
  positionType: "LONG" | "SHORT";
  entryDate: string;
  sellDate?: string | null;
  realizedPnl?: number | null;
  outcome?: "PROFIT" | "LOSS" | null;
};

type Bucket = "day" | "week" | "month" | "year";

type Analytics = {
  growth: { bucket: string; cumulativePnl: number }[];
  winsLongShort: { name: string; value: number }[];
  lossesLongShort: { name: string; value: number }[];
  winsByTicker: { name: string; value: number }[];
  totals: { trades: number; wins: number; losses: number };
};

type DailyPnlMap = Record<string, number>;

const COLORS = [
  "#818cf8",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#a78bfa",
  "#64748b",
];

function toDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(+d)) return null;
  return d.toISOString().slice(0, 10);
}

function buildDailyPnl(trades: Trade[]): DailyPnlMap {
  const map: DailyPnlMap = {};
  for (const t of trades) {
    const key = toDateKey(t.sellDate) ?? toDateKey(t.entryDate);
    if (!key) continue;
    map[key] = (map[key] ?? 0) + (t.realizedPnl ?? 0);
  }
  return map;
}

function getCalendarCells(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstWeekday = first.getDay();

  const cells: ({ iso: string; day: number } | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d);
    cells.push({ iso: date.toISOString().slice(0, 10), day: d });
  }
  return cells;
}

export default function AccountPage() {
  const { isLoaded } = useUser();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loadingTrades, setLoadingTrades] = useState(false);

  const [analyticsBucket, setAnalyticsBucket] = useState<Bucket>("month");
  const [analyticsData, setAnalyticsData] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  async function fetchTrades() {
    try {
      setLoadingTrades(true);
      const res = await fetch("/api/trades", { cache: "no-store" });
      if (!res.ok) {
        setLoadError(`${res.status} ${res.statusText}`);
        return;
      }
      const data = await res.json();
      setTrades(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoadingTrades(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    fetchTrades();
    const id = setInterval(fetchTrades, 30_000);
    return () => clearInterval(id);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    let alive = true;
    (async () => {
      setLoadingAnalytics(true);
      try {
        const res = await fetch(
          `/api/account/analytics?bucket=${analyticsBucket}`,
          { cache: "no-store" },
        );
        const j = (await res.json()) as Analytics;
        if (alive) setAnalyticsData(j);
      } catch {
        // Analytics load failed — charts will show empty state
      } finally {
        if (alive) setLoadingAnalytics(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isLoaded, analyticsBucket]);

  const dailyPnl = useMemo(() => buildDailyPnl(trades), [trades]);
  const cells = useMemo(() => getCalendarCells(currentMonth), [currentMonth]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthLabel = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const currentGrowth = useMemo(
    () =>
      analyticsData?.growth?.length
        ? analyticsData.growth[analyticsData.growth.length - 1].cumulativePnl
        : 0,
    [analyticsData],
  );

  const winRate = useMemo(() => {
    if (!analyticsData?.totals) return null;
    const decided = analyticsData.totals.wins + analyticsData.totals.losses;
    if (decided === 0) return null;
    return ((analyticsData.totals.wins / decided) * 100).toFixed(1);
  }, [analyticsData]);

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

  if (!isLoaded)
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 text-gray-400">
        Loading...
      </main>
    );

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">My Account</h1>
        <p className="text-gray-500">
          Daily P&L calendar, growth analytics, and trade imports.
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm">
          Failed to load trades: {loadError}
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Realized P&L</p>
          <p
            className={`text-2xl font-bold ${currentGrowth >= 0 ? "text-profit" : "text-loss"}`}
          >
            {currentGrowth.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Total Trades</p>
          <p className="text-2xl font-bold text-white">
            {analyticsData?.totals?.trades ?? 0}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-accent-light">
            {winRate ? `${winRate}%` : "—"}
          </p>
        </div>
        <div className="card p-5 flex items-center justify-between">
          <p className="text-sm text-gray-500">Bucket</p>
          <select
            value={analyticsBucket}
            onChange={(e) => setAnalyticsBucket(e.target.value as Bucket)}
            className="input-field w-auto"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      {/* P&L Calendar */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">P&L Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  (prev) =>
                    new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
              className="btn-ghost text-sm"
            >
              Prev
            </button>
            <span className="text-sm font-medium text-gray-300 min-w-[140px] text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  (prev) =>
                    new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
              className="btn-ghost text-sm"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-profit/30 border border-profit/50" />
            Profit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-loss/30 border border-loss/50" />
            Loss
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-surface-200 border border-surface-400" />
            No trades
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-center font-medium text-gray-600 mb-1"
            >
              {d}
            </div>
          ))}

          {cells.map((cell, idx) => {
            if (!cell) return <div key={idx} className="h-14" />;

            const pnl = dailyPnl[cell.iso] ?? 0;
            let bg = "bg-surface-200 border-surface-400 text-gray-500";
            if (pnl > 0)
              bg = "bg-profit/15 border-profit/30 text-profit";
            if (pnl < 0)
              bg = "bg-loss/15 border-loss/30 text-loss";

            const isToday = cell.iso === todayKey;

            return (
              <div
                key={cell.iso}
                className={`h-14 rounded-lg border flex flex-col items-center justify-center transition-colors ${bg} ${
                  isToday ? "ring-2 ring-accent/50 ring-offset-1 ring-offset-surface" : ""
                }`}
              >
                <div className="text-xs font-semibold">{cell.day}</div>
                {pnl !== 0 && (
                  <div className="text-[10px] font-mono mt-0.5">
                    {pnl > 0 ? "+" : ""}${Math.abs(pnl).toFixed(0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loadingTrades && (
          <p className="mt-3 text-xs text-gray-600">Updating...</p>
        )}
      </section>

      {/* Growth chart */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Growth Over Time
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={analyticsData?.growth ?? []}
              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
            >
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={{ stroke: "#2a2a38" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                width={70}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={{ stroke: "#2a2a38" }}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: number) => [`$${v.toLocaleString()}`, "P&L"]}
                {...tooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="cumulativePnl"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#818cf8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Pie charts */}
      <section className="grid md:grid-cols-3 gap-5">
        <PieCard
          title="Wins: Long vs Short"
          data={analyticsData?.winsLongShort ?? []}
          tooltipStyle={tooltipStyle}
        />
        <PieCard
          title="Losses: Long vs Short"
          data={analyticsData?.lossesLongShort ?? []}
          tooltipStyle={tooltipStyle}
        />
        <PieCard
          title="Wins by Ticker"
          data={analyticsData?.winsByTicker ?? []}
          tooltipStyle={tooltipStyle}
        />
      </section>

      {loadingAnalytics && (
        <p className="text-sm text-gray-600">Loading analytics...</p>
      )}

      {/* Import trades */}
      <ImportTrades onImported={fetchTrades} />
    </main>
  );
}

function PieCard({
  title,
  data,
  tooltipStyle,
}: {
  title: string;
  data: { name: string; value: number }[];
  tooltipStyle: Record<string, unknown>;
}) {
  return (
    <div className="card p-6">
      <h3 className="text-base font-semibold text-white mb-3">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={80}
              label
              labelLine={false}
              stroke="#0a0a0f"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend
              wrapperStyle={{ fontSize: "0.75rem", color: "#9ca3af" }}
            />
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
