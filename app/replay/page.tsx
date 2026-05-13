"use client";

import { useEffect, useState, useRef } from "react";

type Trade = {
  id: string;
  ticker: string;
  strategy: string | null;
  positionType: "LONG" | "SHORT";
  entryDate: string;
  sellDate?: string | null;
  totalBuyQty?: number | null;
  avgBuyPrice?: number | null;
  totalSellQty?: number | null;
  avgSellPrice?: number | null;
  realizedPnl?: number | null;
  outcome?: "PROFIT" | "LOSS" | null;
  chartUrl?: string | null;
  aiAnalysis?: string | null;
  notes?: string | null;
};

const fmtUSD = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "—";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(+d) ? "—" : d.toLocaleDateString();
};

export default function ReplayPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selected, setSelected] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/trades", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : [];
          setTrades(arr);
          if (arr.length > 0) setSelected(arr[0]);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 text-gray-400">
        Loading...
      </main>
    );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          Trade Replay
        </h1>
        <p className="text-gray-500 text-sm">
          Review your trades with chart snapshots and live charts side by side.
        </p>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Trade list sidebar */}
        <div className="card p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">
            Select a Trade
          </h2>
          <div className="space-y-1.5">
            {trades.length === 0 ? (
              <p className="text-sm text-gray-600">No trades yet.</p>
            ) : (
              trades.map((t) => {
                const isActive = selected?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-accent/15 text-accent-light"
                        : "text-gray-400 hover:bg-surface-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t.ticker}</span>
                      <span
                        className={`text-xs ${
                          t.outcome === "PROFIT"
                            ? "text-profit"
                            : t.outcome === "LOSS"
                              ? "text-loss"
                              : "text-gray-600"
                        }`}
                      >
                        {fmtUSD(t.realizedPnl)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {fmtDate(t.entryDate)} · {t.strategy || t.positionType}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main replay area */}
        <div className="space-y-6">
          {!selected ? (
            <div className="card p-12 text-center text-gray-500">
              Select a trade from the list to replay it.
            </div>
          ) : (
            <>
              {/* Trade details header */}
              <div className="card p-5">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="text-xl font-bold text-white">
                    {selected.ticker}
                  </h2>
                  {selected.strategy && (
                    <span className="text-sm text-gray-500">
                      {selected.strategy}
                    </span>
                  )}
                  <span
                    className={`badge ${
                      selected.positionType === "LONG"
                        ? "bg-profit/15 text-profit"
                        : "bg-loss/15 text-loss"
                    }`}
                  >
                    {selected.positionType}
                  </span>
                  {selected.outcome && (
                    <span
                      className={`badge ${
                        selected.outcome === "PROFIT"
                          ? "bg-profit/15 text-profit"
                          : "bg-loss/15 text-loss"
                      }`}
                    >
                      {selected.outcome}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Entry</p>
                    <p className="text-gray-200">{fmtDate(selected.entryDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Exit</p>
                    <p className="text-gray-200">
                      {fmtDate(selected.sellDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">P&L</p>
                    <p
                      className={`font-mono font-medium ${
                        (selected.realizedPnl ?? 0) >= 0
                          ? "text-profit"
                          : "text-loss"
                      }`}
                    >
                      {fmtUSD(selected.realizedPnl)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fills</p>
                    <p className="text-gray-200">
                      B: {selected.totalBuyQty ?? 0} @{" "}
                      {selected.avgBuyPrice?.toFixed(2) ?? "—"} / S:{" "}
                      {selected.totalSellQty ?? 0} @{" "}
                      {selected.avgSellPrice?.toFixed(2) ?? "—"}
                    </p>
                  </div>
                </div>
                {selected.notes && (
                  <p className="text-sm text-gray-500 mt-3 italic">
                    {selected.notes}
                  </p>
                )}
              </div>

              {/* Chart snapshot */}
              {selected.chartUrl && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">
                    Chart Snapshot (at time of trade)
                  </h3>
                  <img
                    src={selected.chartUrl}
                    alt={`${selected.ticker} chart`}
                    className="w-full rounded-lg border border-surface-300"
                  />
                </div>
              )}

              {/* Live TradingView chart */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">
                  Current Chart
                </h3>
                <TradingViewWidget symbol={selected.ticker} />
              </div>

              {/* AI Analysis */}
              {selected.aiAnalysis && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-accent-light mb-2">
                    AI Analysis
                  </h3>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selected.aiAnalysis}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(14, 14, 20, 1)",
      gridColor: "rgba(42, 42, 56, 0.3)",
      allow_symbol_change: true,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="h-[400px] rounded-lg overflow-hidden border border-surface-300">
      <div
        className="tradingview-widget-container"
        ref={containerRef}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
