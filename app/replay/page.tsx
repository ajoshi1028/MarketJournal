"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  createChart,
  ColorType,
  CandlestickData,
  Time,
  createSeriesMarkers,
} from "lightweight-charts";
import { CandlestickSeries } from "lightweight-charts";

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
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${m}/${d}/${y}`;
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

              {/* Historical chart for trade date range */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">
                  Trade Chart
                </h3>
                <TradeChart
                  symbol={selected.ticker}
                  entryDate={selected.entryDate}
                  exitDate={selected.sellDate}
                />
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

type ChartData = { candles: CandlestickData<Time>[]; isIntraday?: boolean };

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "60m" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1wk" },
];

function TradeChart({
  symbol,
  entryDate,
  exitDate,
}: {
  symbol: string;
  entryDate: string;
  exitDate?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  const entry = new Date(entryDate);
  const daysAgo = Math.floor((Date.now() - entry.getTime()) / 86400000);
  const defaultInterval = daysAgo > 55 ? "1d" : "15m";
  const [interval, setInterval] = useState(defaultInterval);
  const prevEntryRef = useRef(entryDate);

  if (prevEntryRef.current !== entryDate) {
    prevEntryRef.current = entryDate;
    const newDaysAgo = Math.floor((Date.now() - new Date(entryDate).getTime()) / 86400000);
    const newDefault = newDaysAgo > 55 ? "1d" : "15m";
    if (interval !== newDefault) setInterval(newDefault);
  }
  const exit = exitDate ? new Date(exitDate) : entry;

  useEffect(() => {
    let cancelled = false;

    const isIntraday = !interval.includes("d") && !interval.includes("wk");

    const padBefore = new Date(entry);
    const padAfter = new Date(exit);

    if (isIntraday) {
      padBefore.setDate(padBefore.getDate() - 1);
      padAfter.setDate(padAfter.getDate() + 1);
    } else if (interval === "1wk") {
      padBefore.setDate(padBefore.getDate() - 60);
      padAfter.setDate(padAfter.getDate() + 20);
    } else {
      padBefore.setDate(padBefore.getDate() - 30);
      padAfter.setDate(padAfter.getDate() + 10);
    }

    const from = padBefore.toISOString().slice(0, 10);
    const to = padAfter.toISOString().slice(0, 10);

    setLoading(true);
    setError(null);
    setChartData(null);

    fetch(
      `/api/chart-data?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&interval=${interval}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.candles?.length) {
          setError(
            isIntraday
              ? "No intraday data available — try a larger timeframe (1D or 1W). Yahoo Finance only keeps ~60 days of intraday data."
              : "No chart data available for this date range.",
          );
          setLoading(false);
          return;
        }
        setChartData(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load chart data.");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, entryDate, exitDate, interval]);

  useEffect(() => {
    if (!chartData || !containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }

    const container = containerRef.current;
    const isIntraday = chartData.isIntraday === true;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#0e0e14" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(42, 42, 56, 0.3)" },
        horzLines: { color: "rgba(42, 42, 56, 0.3)" },
      },
      crosshair: {
        vertLine: { color: "#6366f1", width: 1, style: 2 },
        horzLine: { color: "#6366f1", width: 1, style: 2 },
      },
      timeScale: {
        borderColor: "#2a2a38",
        timeVisible: isIntraday,
        secondsVisible: false,
        barSpacing: isIntraday ? 6 : 12,
      },
      rightPriceScale: {
        borderColor: "#2a2a38",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    candleSeries.setData(chartData.candles);

    if (!isIntraday) {
      const entryStr = entry.toISOString().slice(0, 10);
      const exitStr = exit.toISOString().slice(0, 10);

      createSeriesMarkers(candleSeries, [
        {
          time: entryStr as Time,
          position: "belowBar",
          color: "#6366f1",
          shape: "arrowUp",
          text: "Entry",
        },
        ...(exitDate
          ? [
              {
                time: exitStr as Time,
                position: "aboveBar" as const,
                color: "#f59e0b",
                shape: "arrowDown" as const,
                text: "Exit",
              },
            ]
          : []),
      ]);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (container && chartRef.current) {
        chartRef.current.applyOptions({ width: container.clientWidth });
        chartRef.current.timeScale().fitContent();
      }
    });
    ro.observe(container);
    roRef.current = ro;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      roRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData]);

  return (
    <div className="rounded-lg overflow-hidden border border-surface-300 relative">
      <div className="flex items-center gap-1 px-3 py-2 bg-surface-200 border-b border-surface-300">
        {INTERVALS.map((iv) => (
          <button
            key={iv.value}
            onClick={() => setInterval(iv.value)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              interval === iv.value
                ? "bg-accent text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-surface-300"
            }`}
          >
            {iv.label}
          </button>
        ))}
      </div>
      {loading && (
        <div className="h-[400px] flex items-center justify-center text-gray-500 text-sm">
          <div className="inline-block w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mr-2" />
          Loading chart...
        </div>
      )}
      {error && (
        <div className="h-[400px] flex items-center justify-center text-gray-500 text-sm px-6 text-center">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className={loading || error ? "invisible h-0 overflow-hidden" : ""}
      />
    </div>
  );
}
