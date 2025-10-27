// app/account/page.tsx
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
  "#2563eb",
  "#ef4444",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#14b8a6",
  "#64748b",
];

export default function AccountPage() {
  const [bucket, setBucket] = useState<Bucket>("month");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);

  // Optional: if you persist balance in Account, fetch & show it here
  // For now just show the running P&L last point as “growth”
  const currentGrowth = useMemo(
    () =>
      data?.growth?.length
        ? data.growth[data.growth.length - 1].cumulativePnl
        : 0,
    [data]
  );

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

  return (
    <main className="max-w-6xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Account</h1>
        <p className="text-gray-600">
          Your portfolio visuals update as trades realize P&amp;L.
        </p>
      </div>

      {/* Balance/Growth card + range */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-blue-800 mb-1">
            Current Growth (Realized P&L)
          </h2>
          <p className="text-3xl font-bold text-blue-900">
            {currentGrowth.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-blue-900">Bucket</label>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as Bucket)}
            className="border rounded-md px-3 py-2"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      {/* Line chart */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Growth Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data?.growth ?? []}
              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
            >
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${v}`} width={70} />
              <Tooltip
                formatter={(v: any) => `$${Number(v).toLocaleString()}`}
              />
              <Line
                type="monotone"
                dataKey="cumulativePnl"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Pie charts */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Wins: Long vs Short</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.winsLongShort ?? []}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {(data?.winsLongShort ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Losses: Long vs Short</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.lossesLongShort ?? []}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {(data?.lossesLongShort ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Wins by Ticker</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.winsByTicker ?? []}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {(data?.winsByTicker ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {loading && <p className="text-sm text-gray-500">Loading analytics…</p>}
    </main>
  );
}
