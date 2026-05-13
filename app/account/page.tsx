"use client";

import { useEffect, useMemo, useState } from "react";
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

type Bucket = "day" | "week" | "month" | "year";

type Analytics = {
  growth: { bucket: string; cumulativePnl: number }[];
  winsLongShort: { name: string; value: number }[];
  lossesLongShort: { name: string; value: number }[];
  winsByTicker: { name: string; value: number }[];
  totals: { trades: number; wins: number; losses: number };
};

const COLORS = [
  "#818cf8",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#a78bfa",
  "#64748b",
];

export default function AccountPage() {
  const [bucket, setBucket] = useState<Bucket>("month");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);

  const currentGrowth = useMemo(
    () =>
      data?.growth?.length
        ? data.growth[data.growth.length - 1].cumulativePnl
        : 0,
    [data],
  );

  const winRate = useMemo(() => {
    if (!data?.totals || data.totals.trades === 0) return null;
    const decided = data.totals.wins + data.totals.losses;
    if (decided === 0) return null;
    return ((data.totals.wins / decided) * 100).toFixed(1);
  }, [data]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/account/analytics?bucket=${bucket}`, {
          cache: "no-store",
        });
        const j = (await res.json()) as Analytics;
        if (alive) setData(j);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [bucket]);

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

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">My Account</h1>
        <p className="text-gray-500">
          Portfolio analytics update as trades realize P&L.
        </p>
      </div>

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
            {data?.totals?.trades ?? 0}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-accent-light">
            {winRate ? `${winRate}%` : "—"}
          </p>
        </div>
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Bucket</p>
          </div>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as Bucket)}
            className="input-field w-auto"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      {/* Line chart */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Growth Over Time
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data?.growth ?? []}
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
          data={data?.winsLongShort ?? []}
          tooltipStyle={tooltipStyle}
        />
        <PieCard
          title="Losses: Long vs Short"
          data={data?.lossesLongShort ?? []}
          tooltipStyle={tooltipStyle}
        />
        <PieCard
          title="Wins by Ticker"
          data={data?.winsByTicker ?? []}
          tooltipStyle={tooltipStyle}
        />
      </section>

      {loading && (
        <p className="text-sm text-gray-500">Loading analytics...</p>
      )}
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
