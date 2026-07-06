"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type UnusualRow = {
  symbol: string;
  type: "CALL" | "PUT";
  strike: number;
  expiry: string;
  spot: number;
  otmPct: number;
  volume: number;
  openInterest: number;
  volOiRatio: number;
  estPremium: number;
  iv: number | null;
};

type FlowResponse = {
  rows: UnusualRow[];
  symbols: string[];
  failed: string[];
  asOf: string;
  note: string;
};

const DEFAULT_INPUT = "SPY, QQQ, NVDA, TSLA, AAPL, AMD, META, AMZN";

const fmtPremium = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtExpiry = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${String(y).slice(2)}`;
};

export default function EdgePage() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [data, setData] = useState<FlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const fetchFlow = useCallback(async (symbolsCsv: string) => {
    setLoading(true);
    setError(null);
    setUpgradeRequired(false);
    try {
      const symbols = symbolsCsv
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .join(",");
      const res = await fetch(`/api/edge/flow?symbols=${encodeURIComponent(symbols)}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.upgradeRequired) setUpgradeRequired(true);
        else setError(body.error || "Failed to load flow data.");
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setError("Network error loading flow data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlow(DEFAULT_INPUT);
  }, [fetchFlow]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8 border-b border-surface-300 pb-6">
        <p className="kicker mb-3">Edge · 01</p>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white">
          Unusual Activity
        </h1>
        <p className="font-mono text-xs text-gray-500 mt-3">
          Contracts trading far above open interest — new positioning, ranked by premium.
        </p>
        <div className="mt-4 flex gap-4 font-mono text-[11px] uppercase tracking-[0.2em]">
          <span className="text-accent-light">01 Flow</span>
          <Link href="/edge/gex" className="text-gray-500 hover:text-gray-300 transition-colors">
            02 Exposure
          </Link>
          <Link href="/edge/news" className="text-gray-500 hover:text-gray-300 transition-colors">
            03 News
          </Link>
        </div>
      </div>

      {/* Controls */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchFlow(input);
        }}
        className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="edge-symbols" className="label">
            Symbols (comma separated, max 10)
          </label>
          <input
            id="edge-symbols"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input-field font-mono uppercase"
            placeholder="SPY, QQQ, NVDA"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? "Scanning..." : "Scan"}
        </button>
      </form>

      {/* Pro upsell */}
      {upgradeRequired && (
        <div className="card p-8 text-center">
          <p className="kicker mb-3">Pro feature</p>
          <h2 className="text-xl font-light text-white mb-2">
            Unusual-activity screening is part of Pro
          </h2>
          <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
            Scan option chains for volume spiking far above open interest — the
            footprint of new institutional positioning — across your watchlist.
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

      {/* Results */}
      {!upgradeRequired && !error && (
        <div className="card">
          <div className="panel-head">
            <span>Flow Scanner</span>
            <span>
              {data ? `as of ${new Date(data.asOf).toLocaleTimeString()} · delayed` : "—"}
            </span>
          </div>

          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-surface-200" />
                ))}
              </div>
            </div>
          ) : data && data.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-300 font-mono text-[10px] uppercase tracking-[0.15em] text-gray-500">
                    <th className="text-left px-4 py-2.5 font-medium">Sym</th>
                    <th className="text-left px-3 py-2.5 font-medium">Type</th>
                    <th className="text-right px-3 py-2.5 font-medium">Strike</th>
                    <th className="text-right px-3 py-2.5 font-medium">Exp</th>
                    <th className="text-right px-3 py-2.5 font-medium">%OTM</th>
                    <th className="text-right px-3 py-2.5 font-medium">Vol</th>
                    <th className="text-right px-3 py-2.5 font-medium">OI</th>
                    <th className="text-right px-3 py-2.5 font-medium">Vol/OI</th>
                    <th className="text-right px-4 py-2.5 font-medium">Est. Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-300 font-mono text-xs">
                  {data.rows.map((r) => (
                    <tr key={`${r.symbol}-${r.type}-${r.strike}-${r.expiry}`} className="hover:bg-surface-200/40 transition-colors">
                      <td className="px-4 py-2.5 text-white font-bold">{r.symbol}</td>
                      <td className={`px-3 py-2.5 font-bold ${r.type === "CALL" ? "text-profit" : "text-loss"}`}>
                        {r.type === "CALL" ? "C" : "P"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-200">{r.strike}</td>
                      <td className="px-3 py-2.5 text-right text-gray-400">{fmtExpiry(r.expiry)}</td>
                      <td className={`px-3 py-2.5 text-right ${Math.abs(r.otmPct) < 0.5 ? "text-amber-400" : "text-gray-400"}`}>
                        {r.otmPct >= 0 ? "+" : ""}
                        {r.otmPct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-200">{r.volume.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{r.openInterest.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-accent-light">{r.volOiRatio.toFixed(1)}×</td>
                      <td className="px-4 py-2.5 text-right text-white font-bold">{fmtPremium(r.estPremium)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              No unusual activity found for these symbols right now.
              {data?.failed && data.failed.length > 0 && (
                <span className="block mt-1 text-xs text-gray-600">
                  No data for: {data.failed.join(", ")}
                </span>
              )}
            </div>
          )}

          {data && data.rows.length > 0 && (
            <div className="px-4 py-2.5 border-t border-surface-300 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
                {data.note}
              </p>
              {data.failed.length > 0 && (
                <p className="font-mono text-[10px] text-gray-600">
                  no data: {data.failed.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-gray-600">
        Data is delayed and for informational purposes only — not financial advice.
      </p>
    </main>
  );
}
