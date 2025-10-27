"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

type Trade = {
  id: string;
  userId: string;
  ticker: string;
  strategy: string | null;
  positionType: "LONG" | "SHORT";
  entryDate: string;
  sellDate?: string | null;
  totalBuyQty?: number | null;
  totalSellQty?: number | null;
  avgBuyPrice?: number | null;
  avgSellPrice?: number | null;
  realizedPnl?: number | null;
  outcome?: "PROFIT" | "LOSS" | null;
  notes?: string | null;
  chartUrl?: string | null;
  aiAnalysis?: string | null;
};

type PosFilter = "ALL" | "LONG" | "SHORT";
type OutcomeFilter = "ANY" | "PROFIT" | "LOSS";
type SortKey = "DATE_DESC" | "DATE_ASC" | "TICKER_ASC" | "TICKER_DESC" | "PNL_DESC" | "PNL_ASC";

export default function AnalysisPage() {
  const { user, isLoaded } = useUser();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [posFilter, setPosFilter] = useState<PosFilter>("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("ANY");
  const [tickerFilter, setTickerFilter] = useState<string>("ALL");
  const [strategyFilter, setStrategyFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("DATE_DESC");

  useEffect(() => {
    if (!isLoaded || !user) return;
    (async () => {
      try {
        const res = await fetch("/api/trades", { cache: "no-store" });
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          setLoadError(`${res.status} ${res.statusText}${raw ? ` – ${raw}` : ""}`);
          return;
        }
        const data = (await res.json()) as Trade[];
        setTrades(Array.isArray(data) ? data : []);
        setLoadError(null);
      } catch (e: any) {
        setLoadError(`Network error: ${e?.message ?? e}`);
      }
    })();
  }, [isLoaded, user]);

  const allTickers = useMemo(
    () => Array.from(new Set(trades.map((t) => t.ticker))).sort((a, b) => a.localeCompare(b)),
    [trades]
  );
  const allStrategies = useMemo(
    () => Array.from(new Set(trades.map((t) => t.strategy || ""))).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [trades]
  );

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (posFilter !== "ALL" && t.positionType !== posFilter) return false;
      if (outcomeFilter !== "ANY" && (t.outcome ?? null) !== (outcomeFilter as "PROFIT" | "LOSS")) return false;
      if (tickerFilter !== "ALL" && t.ticker !== tickerFilter) return false;
      if (strategyFilter !== "ALL" && (t.strategy ?? "") !== strategyFilter) return false;
      return true;
    });
  }, [trades, posFilter, outcomeFilter, tickerFilter, strategyFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      switch (sortKey) {
        case "DATE_ASC":  return +new Date(a.entryDate) - +new Date(b.entryDate);
        case "DATE_DESC": return +new Date(b.entryDate) - +new Date(a.entryDate);
        case "TICKER_ASC":  return a.ticker.localeCompare(b.ticker);
        case "TICKER_DESC": return b.ticker.localeCompare(a.ticker);
        case "PNL_ASC":   return (a.realizedPnl ?? 0) - (b.realizedPnl ?? 0);
        case "PNL_DESC":  return (b.realizedPnl ?? 0) - (a.realizedPnl ?? 0);
        default: return 0;
      }
    });
    return copy;
  }, [filtered, sortKey]);

  const fmtUSD = (n?: number | null) =>
    typeof n === "number" ? n.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "—";
  const fmtPrice = (p?: number | null) => (typeof p === "number" ? p.toFixed(2) : "—");
  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(+d) ? "—" : d.toLocaleDateString();
  };

  function setAiResult(id: string, text: string) {
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, aiAnalysis: text } : t)));
  }

  if (!isLoaded) return <main className="max-w-6xl mx-auto p-8">Loading…</main>;

  return (
    <main className="max-w-6xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Track</h1>
        <p className="text-gray-600">Filter and sort your trades, and analyze any trade’s chart with AI.</p>
      </div>

      {loadError && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-red-800">
          Failed to load trades: {loadError}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Position Type</label>
            <div className="flex gap-2">
              {(["ALL", "LONG", "SHORT"] as PosFilter[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setPosFilter(k)}
                  className={`px-3 py-1 rounded border text-sm ${
                    posFilter === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Outcome</label>
            <div className="flex gap-2">
              {(["ANY", "PROFIT", "LOSS"] as OutcomeFilter[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setOutcomeFilter(k)}
                  className={`px-3 py-1 rounded border text-sm ${
                    outcomeFilter === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ticker</label>
            <select
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All tickers</option>
              {allTickers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Strategy</label>
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All strategies</option>
              {allStrategies.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="DATE_DESC">Entry Date (newest)</option>
              <option value="DATE_ASC">Entry Date (oldest)</option>
              <option value="TICKER_ASC">Ticker (A–Z)</option>
              <option value="TICKER_DESC">Ticker (Z–A)</option>
              <option value="PNL_DESC">Realized P&L (high → low)</option>
              <option value="PNL_ASC">Realized P&L (low → high)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {sorted.length === 0 ? (
          <p className="text-gray-500">No trades match your filters.</p>
        ) : (
          sorted.map((t) => {
            const outcomeBox =
              t.outcome === "PROFIT" ? "bg-green-50 border-green-200" :
              t.outcome === "LOSS"   ? "bg-red-50 border-red-200"   : "bg-white";

            const posBadge =
              t.positionType === "LONG" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";

            const dateRange = `${fmtDate(t.entryDate)}${t.sellDate ? ` - ${fmtDate(t.sellDate)}` : ""}`;

            return (
              <TradeRow
                key={t.id}
                t={t}
                outcomeBox={outcomeBox}
                posBadge={posBadge}
                dateRange={dateRange}
                fmtPrice={fmtPrice}
                fmtUSD={fmtUSD}
                setAiResult={setAiResult}
              />
            );
          })
        )}
      </div>
    </main>
  );
}

function TradeRow({
  t,
  outcomeBox,
  posBadge,
  dateRange,
  fmtPrice,
  fmtUSD,
  setAiResult,
}: {
  t: Trade;
  outcomeBox: string;
  posBadge: string;
  dateRange: string;
  fmtPrice: (p?: number | null) => string;
  fmtUSD: (n?: number | null) => string;
  setAiResult: (id: string, text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function analyze() {
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("chartImage", file);

      const res = await fetch(`/api/trades/${encodeURIComponent(t.id)}/analyze`, {
        method: "POST",
        body: fd,
        cache: "no-store",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert(`Analyze failed: ${res.status} ${res.statusText}\n${txt}`);
        return;
      }
      const data = await res.json();
      setAiResult(t.id, data.aiAnalysis || "");
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`p-4 rounded-lg shadow border ${outcomeBox}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{t.ticker}</h3>
          {t.strategy && <span className="text-sm text-gray-600">• {t.strategy}</span>}
        </div>
        <span className={`px-2 py-1 rounded text-xs ${posBadge}`}>{t.positionType}</span>
      </div>

      <p className="text-gray-700 mb-1">Date: {dateRange}</p>

      <div className="grid grid-cols-2 gap-x-6 text-sm mt-2">
        <div>
          <p className="text-gray-600">Bought: {t.totalBuyQty ?? 0} @ {fmtPrice(t.avgBuyPrice)}</p>
          <p className="text-gray-600">Sold: {t.totalSellQty ?? 0} @ {fmtPrice(t.avgSellPrice)}</p>
        </div>
        <div>
          <p className="font-medium">Realized P&amp;L: {fmtUSD(t.realizedPnl ?? 0)}</p>
          {t.outcome && <p className="text-gray-700">Outcome: {t.outcome === "PROFIT" ? "Profit" : "Loss"}</p>}
        </div>
      </div>

      {/* Upload/Analyze */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          onClick={analyze}
          disabled={busy}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-3 py-1 rounded"
        >
          {busy ? "Analyzing…" : "Analyze"}
        </button>
        {t.chartUrl && (
          <a
            href={t.chartUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            View current chart
          </a>
        )}
      </div>

      {/* AI result */}
      {t.aiAnalysis && (
        <div className="mt-3 p-3 rounded border bg-gray-50">
          <p className="text-sm font-semibold mb-1">AI Analysis</p>
          <p className="text-sm whitespace-pre-wrap">{t.aiAnalysis}</p>
        </div>
      )}

      {t.notes && <p className="text-gray-500 text-sm mt-2">{t.notes}</p>}
    </div>
  );
}
