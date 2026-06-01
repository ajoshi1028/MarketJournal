"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";

type Trade = {
  id: string;
  ticker: string;
  strategy: string | null;
  positionType: "LONG" | "SHORT";
  optionType?: string | null;
  strike?: number | null;
  expiry?: string | null;
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

type PosFilter = "ALL" | "CALL" | "PUT";
type OutcomeFilter = "ANY" | "PROFIT" | "LOSS";
type SortKey =
  | "DATE_DESC"
  | "DATE_ASC"
  | "TICKER_ASC"
  | "TICKER_DESC"
  | "PNL_DESC"
  | "PNL_ASC";

const fmtUSD = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "—";

const fmtPrice = (p?: number | null) =>
  typeof p === "number" ? p.toFixed(2) : "—";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${m}/${d}/${y}`;
};

export default function TrackPage() {
  const { user, isLoaded } = useUser();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [posFilter, setPosFilter] = useState<PosFilter>("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("ANY");
  const [tickerFilter, setTickerFilter] = useState("ALL");
  const [strategyFilter, setStrategyFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("DATE_DESC");
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    (async () => {
      try {
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
      }
    })();
  }, [isLoaded, user]);

  const allTickers = useMemo(
    () => Array.from(new Set(trades.map((t) => t.ticker))).sort(),
    [trades],
  );

  const allStrategies = useMemo(
    () =>
      Array.from(new Set(trades.map((t) => t.strategy || "")))
        .filter(Boolean)
        .sort(),
    [trades],
  );

  const filtered = useMemo(
    () =>
      trades.filter((t) => {
        if (posFilter !== "ALL" && (t.optionType || t.positionType) !== posFilter) return false;
        if (outcomeFilter !== "ANY" && t.outcome !== outcomeFilter) return false;
        if (tickerFilter !== "ALL" && t.ticker !== tickerFilter) return false;
        if (strategyFilter !== "ALL" && (t.strategy ?? "") !== strategyFilter)
          return false;
        return true;
      }),
    [trades, posFilter, outcomeFilter, tickerFilter, strategyFilter],
  );

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      switch (sortKey) {
        case "DATE_ASC":
          return +new Date(a.entryDate) - +new Date(b.entryDate);
        case "DATE_DESC":
          return +new Date(b.entryDate) - +new Date(a.entryDate);
        case "TICKER_ASC":
          return a.ticker.localeCompare(b.ticker);
        case "TICKER_DESC":
          return b.ticker.localeCompare(a.ticker);
        case "PNL_ASC":
          return (a.realizedPnl ?? 0) - (b.realizedPnl ?? 0);
        case "PNL_DESC":
          return (b.realizedPnl ?? 0) - (a.realizedPnl ?? 0);
        default:
          return 0;
      }
    });
    return copy;
  }, [filtered, sortKey]);

  /* Render-windowing: paint a slice, grow as you scroll.
     We keep the full list in memory so filters/sort still cover every trade. */
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sortedLenRef = useRef(0);
  sortedLenRef.current = sorted.length;

  // Reset the window whenever filters or sort change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [posFilter, outcomeFilter, tickerFilter, strategyFilter, sortKey]);

  const visible = useMemo(
    () => sorted.slice(0, visibleCount),
    [sorted, visibleCount],
  );

  // Grow the window when the sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) =>
            c < sortedLenRef.current ? c + PAGE_SIZE : c,
          );
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sorted.length, visibleCount]);

  async function clearAllTrades() {
    setClearing(true);
    try {
      const res = await fetch("/api/trades?all=true", { method: "DELETE" });
      if (res.ok) {
        setTrades([]);
        setShowClearModal(false);
      } else {
        alert("Failed to clear trades");
      }
    } catch {
      alert("Network error");
    } finally {
      setClearing(false);
    }
  }

  function setAiResult(id: string, text: string) {
    setTrades((prev) =>
      prev.map((t) => (t.id === id ? { ...t, aiAnalysis: text } : t)),
    );
  }

  if (!isLoaded)
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 text-gray-400">
        Loading...
      </main>
    );

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Track</h1>
          <p className="text-gray-500">
            Filter, sort, and analyze your trades with AI.
          </p>
        </div>
        {trades.length > 0 && (
          <button
            onClick={() => setShowClearModal(true)}
            className="btn-danger text-xs px-3 py-1.5 shrink-0 mt-1"
          >
            Clear All Trades
          </button>
        )}
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm">
          Failed to load trades: {loadError}
        </div>
      )}

      {/* Controls */}
      <div className="card p-5 mb-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 items-end">
          <div>
            <label id="filter-position" className="label">Option Type</label>
            <div className="flex gap-2" role="group" aria-labelledby="filter-position">
              {(["ALL", "CALL", "PUT"] as PosFilter[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setPosFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    posFilter === k
                      ? "bg-accent text-white"
                      : "bg-surface-200 text-gray-400 hover:bg-surface-300"
                  }`}
                >
                  {k === "ALL" ? "All" : k === "CALL" ? "Call" : "Put"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label id="filter-outcome" className="label">Outcome</label>
            <div className="flex gap-2" role="group" aria-labelledby="filter-outcome">
              {(["ANY", "PROFIT", "LOSS"] as OutcomeFilter[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setOutcomeFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    outcomeFilter === k
                      ? "bg-accent text-white"
                      : "bg-surface-200 text-gray-400 hover:bg-surface-300"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="filter-ticker" className="label">Ticker</label>
            <select
              id="filter-ticker"
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              className="input-field"
            >
              <option value="ALL">All tickers</option>
              {allTickers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-strategy" className="label">Strategy</label>
            <select
              id="filter-strategy"
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="input-field"
            >
              <option value="ALL">All strategies</option>
              {allStrategies.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-sort" className="label">Sort By</label>
            <select
              id="filter-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="input-field"
            >
              <option value="DATE_DESC">Date (newest)</option>
              <option value="DATE_ASC">Date (oldest)</option>
              <option value="TICKER_ASC">Ticker (A-Z)</option>
              <option value="TICKER_DESC">Ticker (Z-A)</option>
              <option value="PNL_DESC">P&L (high to low)</option>
              <option value="PNL_ASC">P&L (low to high)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {sorted.length === 0 ? (
          <p className="text-gray-500">No trades match your filters.</p>
        ) : (
          <>
            {visible.map((t) => (
              <TradeRow key={t.id} t={t} setAiResult={setAiResult} />
            ))}
            {visibleCount < sorted.length && (
              <div
                ref={sentinelRef}
                className="py-4 flex items-center justify-center gap-2 text-sm text-gray-600"
              >
                <span className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Loading more…
              </div>
            )}
            <p className="text-center text-xs text-gray-600 pt-1">
              Showing {visible.length} of {sorted.length} trades
            </p>
          </>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="clear-modal-title">
          <div className="card p-6 max-w-sm w-full mx-4">
            <h3 id="clear-modal-title" className="text-lg font-semibold text-white mb-2">Clear all trades?</h3>
            <p className="text-sm text-gray-400 mb-5">
              This will permanently delete <span className="text-white font-medium">{trades.length} trade{trades.length !== 1 && "s"}</span>. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearModal(false)}
                className="btn-ghost"
                disabled={clearing}
              >
                Cancel
              </button>
              <button
                onClick={clearAllTrades}
                disabled={clearing}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {clearing ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function TradeRow({
  t,
  setAiResult,
}: {
  t: Trade;
  setAiResult: (id: string, text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [expanded, setExpanded] = useState(false);

  const borderColor = "border-white/10";

  const bgTint =
    t.outcome === "PROFIT"
      ? "bg-profit-muted"
      : t.outcome === "LOSS"
        ? "bg-loss-muted"
        : "bg-surface-100";

  const displayType = t.optionType || t.positionType;
  const posBadge =
    displayType === "CALL" || displayType === "LONG"
      ? "bg-profit/15 text-profit"
      : "bg-loss/15 text-loss";

  async function analyze() {
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("chartImage", file);

      const res = await fetch(
        `/api/trades/${encodeURIComponent(t.id)}/analyze`,
        { method: "POST", body: fd, cache: "no-store" },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert(`Analyze failed: ${res.status}\n${txt}`);
        return;
      }
      const data = await res.json();
      setAiResult(t.id, data.aiAnalysis || "");
      setFile(null);
      setExpanded(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-xl border ${borderColor} ${bgTint}`}>
      {/* Compact row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center gap-4"
        aria-expanded={expanded}
        aria-label={`${t.ticker} trade details${t.realizedPnl != null ? `, P&L ${fmtUSD(t.realizedPnl)}` : ""}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-white">{t.ticker}</h3>
            <span className="text-xs text-gray-500 truncate">
              {t.optionType && t.strike ? `${t.strike} ${t.optionType}` : ""}{t.optionType && t.strike && t.strategy ? " · " : ""}{t.strategy || (!t.optionType ? `${fmtDate(t.entryDate)}${t.sellDate ? ` → ${fmtDate(t.sellDate)}` : ""}` : "")}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            B: {t.totalBuyQty ?? 0} @ {fmtPrice(t.avgBuyPrice)} / S: {t.totalSellQty ?? 0} @ {fmtPrice(t.avgSellPrice)}
            {t.strategy ? ` · ${fmtDate(t.entryDate)}${t.sellDate ? ` → ${fmtDate(t.sellDate)}` : ""}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p
              className={`font-mono font-medium text-sm ${
                (t.realizedPnl ?? 0) >= 0 ? "text-profit" : "text-loss"
              }`}
            >
              {fmtUSD(t.realizedPnl)}
            </p>
          </div>
          <span className={`badge text-xs ${posBadge}`}>{displayType === "CALL" ? "Call" : displayType === "PUT" ? "Put" : t.positionType}</span>
          {(t.aiAnalysis || t.chartUrl) && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-light shrink-0" title="Has analysis" />
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-surface-300/50">
          <div className="pt-4 space-y-4">
            {/* Upload / Analyze */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                aria-label={`Upload chart image for ${t.ticker}`}
                className="text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3
                           file:rounded-lg file:border-0 file:text-sm file:font-medium
                           file:bg-surface-300 file:text-gray-200 hover:file:bg-surface-400
                           file:cursor-pointer file:transition-colors"
              />
              <button
                onClick={analyze}
                disabled={busy}
                className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
              >
                {busy ? "Analyzing..." : "Analyze"}
              </button>
              {t.chartUrl && (
                <a
                  href={t.chartUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-light hover:text-accent text-sm transition-colors"
                >
                  View chart
                </a>
              )}
            </div>

            {/* AI result */}
            {t.aiAnalysis && (
              <div className="p-4 rounded-lg bg-surface-200/50 border border-surface-300">
                <p className="text-xs font-semibold text-accent-light mb-1.5">
                  AI Analysis
                </p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {t.aiAnalysis}
                </p>
              </div>
            )}

            {t.notes && (
              <p className="text-gray-500 text-sm italic">{t.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
