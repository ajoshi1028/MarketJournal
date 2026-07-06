"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type GexStrikeRow = {
  strike: number;
  byExpiry: number[];
  net: number;
  callGex: number;
  putGex: number;
};

type GexProfile = {
  symbol: string;
  spot: number;
  metric: "gex" | "vex";
  expiries: string[];
  strikes: GexStrikeRow[];
  netTotal: number;
  zeroGamma: number | null;
  maxPain: number | null;
  frontExpiry: string | null;
  asOf: string;
};

const fmtDollars = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const fmtExpiry = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return m && d ? `${m}/${d}` : iso;
};

function cellStyle(value: number, maxAbs: number): React.CSSProperties {
  if (value === 0 || maxAbs === 0) return {};
  const alpha = Math.max(0.07, Math.min(0.85, Math.abs(value) / maxAbs));
  return {
    backgroundColor:
      value > 0 ? `rgba(52, 211, 153, ${alpha})` : `rgba(248, 113, 113, ${alpha})`,
  };
}

export default function GexPage() {
  const [symbol, setSymbol] = useState("SPY");
  const [metric, setMetric] = useState<"gex" | "vex">("gex");
  const [data, setData] = useState<GexProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const fetchProfile = useCallback(async (sym: string, m: "gex" | "vex") => {
    setLoading(true);
    setError(null);
    setUpgradeRequired(false);
    try {
      const res = await fetch(
        `/api/edge/gex?symbol=${encodeURIComponent(sym.trim().toUpperCase())}&metric=${m}`,
        { cache: "no-store" },
      );
      const body = await res.json();
      if (!res.ok) {
        if (body.upgradeRequired) setUpgradeRequired(true);
        else setError(body.error || "Failed to load exposure data.");
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setError("Network error loading exposure data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile("SPY", "gex");
  }, [fetchProfile]);

  const maxAbs = data
    ? Math.max(...data.strikes.flatMap((r) => r.byExpiry.map(Math.abs)), 0)
    : 0;
  const maxAbsNet = data ? Math.max(...data.strikes.map((r) => Math.abs(r.net)), 0) : 0;
  const unit = metric === "gex" ? "per 1% move" : "per vol pt";

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8 border-b border-surface-300 pb-6">
        <p className="kicker mb-3">Edge · 02</p>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white">
          {metric === "gex" ? "Gamma Exposure" : "Vega Exposure"}
        </h1>
        <p className="font-mono text-xs text-gray-500 mt-3">
          Dealer positioning by strike × expiry. Calls positive, puts negative.
        </p>
        <div className="mt-4 flex gap-4 font-mono text-[11px] uppercase tracking-[0.2em]">
          <Link href="/edge" className="text-gray-500 hover:text-gray-300 transition-colors">
            01 Flow
          </Link>
          <span className="text-accent-light">02 Exposure</span>
          <Link href="/edge/news" className="text-gray-500 hover:text-gray-300 transition-colors">
            03 News
          </Link>
        </div>
      </div>

      {/* Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchProfile(symbol, metric);
        }}
        className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="w-full sm:w-48">
          <label htmlFor="gex-symbol" className="label">Symbol</label>
          <input
            id="gex-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="input-field font-mono uppercase"
            placeholder="SPY"
          />
        </div>
        <div className="flex border border-surface-400">
          {(["gex", "vex"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMetric(m);
                fetchProfile(symbol, m);
              }}
              className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                metric === m
                  ? "bg-surface-300 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? "Loading..." : "Load"}
        </button>
      </form>

      {upgradeRequired && (
        <div className="card p-8 text-center">
          <p className="kicker mb-3">Pro feature</p>
          <h2 className="text-xl font-light text-white mb-2">
            Exposure heatmaps are part of Pro
          </h2>
          <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
            GEX and VEX by strike and expiry, zero-gamma flip level, and max
            pain — the dealer-positioning map behind big index moves.
          </p>
          <Link href="/billing" className="btn-primary inline-block">
            Upgrade to Pro — $19.99/mo
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-4 border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!upgradeRequired && !error && data && !loading && (
        <>
          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border border-surface-300 divide-x divide-y sm:divide-y-0 divide-surface-300 mb-6">
            {[
              { label: "Spot", value: data.spot.toFixed(2), color: "text-white" },
              {
                label: `Net ${metric.toUpperCase()} ${unit}`,
                value: fmtDollars(data.netTotal),
                color: data.netTotal >= 0 ? "text-profit" : "text-loss",
              },
              {
                label: "Zero-gamma (approx)",
                value: data.zeroGamma != null ? data.zeroGamma.toFixed(0) : "—",
                color: "text-amber-400",
              },
              {
                label: `Max pain (${data.frontExpiry ? fmtExpiry(data.frontExpiry) : "—"})`,
                value: data.maxPain != null ? String(data.maxPain) : "—",
                color: "text-white",
              },
            ].map((s) => (
              <div key={s.label} className="px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                  {s.label}
                </p>
                <p className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <div className="card">
            <div className="panel-head">
              <span>
                {data.symbol} · {metric.toUpperCase()} heatmap
              </span>
              <span>delayed · {new Date(data.asOf).toLocaleTimeString()}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-surface-300 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="text-right px-3 py-2 font-medium sticky left-0 bg-surface-100">
                      Strike
                    </th>
                    {data.expiries.map((e) => (
                      <th key={e} className="text-center px-2 py-2 font-medium">
                        {fmtExpiry(e)}
                      </th>
                    ))}
                    <th className="text-right px-3 py-2 font-medium border-l border-surface-300">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.strikes.map((row, i) => {
                    const next = data.strikes[i + 1];
                    const spotBetween = next && row.strike >= data.spot && next.strike < data.spot;
                    return (
                      <tr
                        key={row.strike}
                        className={spotBetween ? "border-b-2 border-amber-400/70" : "border-b border-surface-300/50"}
                      >
                        <td className="text-right px-3 py-1.5 text-gray-300 sticky left-0 bg-surface-100">
                          {row.strike}
                        </td>
                        {row.byExpiry.map((v, j) => (
                          <td
                            key={j}
                            className="text-center px-2 py-1.5 text-[10px] text-white/90"
                            style={cellStyle(v, maxAbs)}
                            title={`${fmtDollars(v)} ${unit}`}
                          >
                            {v !== 0 ? fmtDollars(v) : ""}
                          </td>
                        ))}
                        <td
                          className={`text-right px-3 py-1.5 border-l border-surface-300 font-bold ${
                            row.net > 0 ? "text-profit" : row.net < 0 ? "text-loss" : "text-gray-600"
                          }`}
                          style={cellStyle(row.net, maxAbsNet)}
                        >
                          {fmtDollars(row.net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-surface-300 flex items-center gap-5 font-mono text-[10px] uppercase tracking-wider text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-profit/60 inline-block" /> positive (calls)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-loss/60 inline-block" /> negative (puts)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-amber-400/70 inline-block" /> spot
              </span>
            </div>
          </div>
        </>
      )}

      {loading && !upgradeRequired && (
        <div className="card p-8">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-7 bg-surface-200" />
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-gray-600">
        Delayed data · dealer-positioning conventions are estimates — not financial advice.
      </p>
    </main>
  );
}
