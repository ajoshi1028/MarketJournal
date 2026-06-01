"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

type Fill = { qty: string; price: string };

type Trade = {
  id: string;
  ticker: string;
  strategy: string | null;
  positionType: "LONG" | "SHORT";
  optionType?: string | null;
  strike?: number | null;
  expiry?: string | null;
  entryDate: string;
  entryTime?: string | null;
  sellDate?: string | null;
  exitTime?: string | null;
  buyFills?: { qty: number; price: number }[] | null;
  sellFills?: { qty: number; price: number }[] | null;
  totalBuyQty?: number;
  totalSellQty?: number;
  avgBuyPrice?: number | null;
  avgSellPrice?: number | null;
  realizedPnl?: number | null;
  outcome?: "PROFIT" | "LOSS" | null;
  notes?: string | null;
  aiAnalysis?: string | null;
};

type FormState = {
  ticker: string;
  strategy: string;
  positionType: "" | "CALL" | "PUT";
  strike: string;
  expiry: string;
  entryDate: string;
  entryTime: string;
  sellDate: string;
  exitTime: string;
  buyFills: Fill[];
  sellFills: Fill[];
  notes: string;
};

const EMPTY_FORM: FormState = {
  ticker: "",
  strategy: "",
  positionType: "",
  strike: "",
  expiry: "",
  entryDate: "",
  entryTime: "",
  sellDate: "",
  exitTime: "",
  buyFills: [{ qty: "", price: "" }],
  sellFills: [{ qty: "", price: "" }],
  notes: "",
};

const CSV_BROKERS = [
  { id: "robinhood", name: "Robinhood" },
  { id: "webull", name: "Webull" },
];

const fmtUSD = (n: number | null | undefined) =>
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

export default function TradesPage() {
  const { user, isLoaded } = useUser();

  /* Manual trade form */
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ isPro: boolean; chart: { used: number; limit: number } } | null>(null);

  /* Pagination */
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 10;

  /* CSV import */
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvBroker, setCsvBroker] = useState("robinhood");
  const [csvStatus, setCsvStatus] = useState<string | null>(null);
  const [csvIsError, setCsvIsError] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  /* Active tab for input method */
  const [activeTab, setActiveTab] = useState<"csv" | "manual">("csv");

  const fetchTrades = useCallback(async (reset = true) => {
    try {
      const cursor = reset ? "" : nextCursor;
      if (!reset && !cursor) return; // no more pages
      if (!reset) setLoadingMore(true);

      const url = `/api/trades?limit=${PAGE_SIZE}${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setLoadError(`${res.status} ${res.statusText}`);
        return;
      }
      const data = await res.json();
      const items: Trade[] = data.items ?? [];

      if (reset) {
        setTrades(items);
        if (data.total != null) setTotalCount(data.total);
      } else {
        setTrades((prev) => [...prev, ...items]);
      }
      setNextCursor(data.nextCursor ?? null);
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchTrades(true);
      fetch("/api/usage", { cache: "no-store" })
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setUsage(d))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          fetchTrades(false);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchTrades]);


  /* ── CSV Import ── */
  async function handleCsvImport(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvStatus(null);
    setCsvIsError(false);

    try {
      const fd = new FormData();
      fd.append("broker", csvBroker);
      fd.append("file", csvFile);

      const res = await fetch("/api/import-trades", {
        method: "POST",
        body: fd,
      });

      const text = await res.text();
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }

      if (!res.ok) {
        setCsvIsError(true);
        setCsvStatus(String(body.error || body.details || "Import failed"));
      } else {
        setCsvStatus(String(body.message || "Import successful!"));
        setCsvFile(null);
        await fetchTrades(true);
        }
    } catch {
      setCsvIsError(true);
      setCsvStatus("Network error");
    } finally {
      setCsvLoading(false);
    }
  }

  /* ── Manual trade form ── */
  function setField(name: keyof FormState, value: unknown) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateFill(
    side: "buyFills" | "sellFills",
    index: number,
    key: keyof Fill,
    value: string,
  ) {
    setForm((prev) => {
      const copy = [...prev[side]];
      copy[index] = { ...copy[index], [key]: value };
      return { ...prev, [side]: copy };
    });
  }

  function addFillRow(side: "buyFills" | "sellFills") {
    setForm((prev) => ({
      ...prev,
      [side]: [...prev[side], { qty: "", price: "" }],
    }));
  }

  function removeFillRow(side: "buyFills" | "sellFills", idx: number) {
    setForm((prev) => {
      const copy = [...prev[side]];
      copy.splice(idx, 1);
      return { ...prev, [side]: copy.length ? copy : [{ qty: "", price: "" }] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.positionType || !form.entryDate || !form.ticker.trim()) return;

    setLoading(true);
    try {
      const toArray = (ary: Fill[]) =>
        ary
          .map((f) => ({ qty: Number(f.qty), price: Number(f.price) }))
          .filter(
            (f) =>
              Number.isFinite(f.qty) &&
              f.qty > 0 &&
              Number.isFinite(f.price) &&
              f.price >= 0,
          );

      const fd = new FormData();
      fd.append("ticker", form.ticker.trim().toUpperCase());
      fd.append("strategy", form.strategy.trim());
      fd.append("positionType", form.positionType === "CALL" ? "LONG" : "SHORT");
      fd.append("optionType", form.positionType);
      if (form.strike) fd.append("strike", form.strike);
      if (form.expiry) fd.append("expiry", form.expiry + "T12:00:00.000Z");
      fd.append("entryDate", form.entryDate + "T12:00:00.000Z");
      if (form.entryTime) fd.append("entryTime", form.entryTime);
      if (form.sellDate)
        fd.append("sellDate", form.sellDate + "T12:00:00.000Z");
      if (form.exitTime) fd.append("exitTime", form.exitTime);
      fd.append("buyFills", JSON.stringify(toArray(form.buyFills)));
      fd.append("sellFills", JSON.stringify(toArray(form.sellFills)));
      fd.append("notes", form.notes.trim());
      if (chartFile) fd.append("chartImage", chartFile);

      const res = await fetch("/api/trades", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = text;
        try {
          msg = JSON.parse(text)?.error || text;
        } catch {}
        alert(`Submit failed: ${msg}`);
        return;
      }

      setForm({ ...EMPTY_FORM });
      setChartFile(null);
      await fetchTrades(true);
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/trades?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = text;
        try {
          msg = JSON.parse(text)?.error || text;
        } catch {}
        alert(`Delete failed: ${msg}`);
        return;
      }
      setTrades((prev) => prev.filter((t) => t.id !== id));
      if (totalCount != null) setTotalCount(totalCount - 1);
    } catch {
      alert("Network error while deleting.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!isLoaded)
    return (
      <div className="max-w-7xl mx-auto p-8 text-gray-400">Loading...</div>
    );

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">Trades</h1>
        <p className="text-sm text-gray-500">Import from your broker or log trades manually.</p>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm">
          Failed to load trades: {loadError}
        </div>
      )}

      <div className="grid lg:grid-cols-[420px_1fr] gap-8">
        {/* ── LEFT: Input methods ── */}
        <div className="space-y-0">
          {/* Tab switcher */}
          <div className="flex border-b border-surface-300 mb-0">
            <button
              onClick={() => setActiveTab("csv")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "csv"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              CSV Import
              {activeTab === "csv" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-light" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "manual"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Manual Entry
              {activeTab === "manual" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-light" />
              )}
            </button>
          </div>

          {/* CSV Import panel */}
          {activeTab === "csv" && (
            <div className="card rounded-t-none border-t-0 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Import from broker</h2>
                  <p className="text-xs text-gray-500">Upload your CSV trade history</p>
                </div>
              </div>

              <form onSubmit={handleCsvImport} className="space-y-3">
                <div>
                  <label htmlFor="csv-broker" className="label">Broker</label>
                  <select
                    id="csv-broker"
                    value={csvBroker}
                    onChange={(e) => setCsvBroker(e.target.value)}
                    className="input-field"
                  >
                    {CSV_BROKERS.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="csv-file" className="label">CSV File</label>
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4
                               file:rounded-lg file:border-0 file:text-sm file:font-medium
                               file:bg-surface-300 file:text-gray-200 hover:file:bg-surface-400
                               file:cursor-pointer file:transition-colors"
                  />
                  {csvFile && (
                    <p className="mt-1 text-xs text-gray-500">
                      {csvFile.name} ({Math.round(csvFile.size / 1024)} KB)
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={csvLoading || !csvFile}
                  className="btn-primary w-full text-sm disabled:opacity-50"
                >
                  {csvLoading ? "Importing..." : "Import Trades"}
                </button>
              </form>

              {csvStatus && (
                <p className={`mt-3 text-sm ${csvIsError ? "text-red-400" : "text-profit"}`}>
                  {csvStatus}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-surface-300 text-xs text-gray-600 space-y-1">
                <p className="font-medium text-gray-500">How to export:</p>
                <p><span className="text-gray-400">Robinhood:</span> Account → Statements & History → download CSV</p>
                <p><span className="text-gray-400">Webull:</span> Account → Reports → Trade details → export CSV</p>
              </div>
            </div>
          )}

          {/* Manual Entry panel */}
          {activeTab === "manual" && (
            <form onSubmit={handleSubmit} className="card rounded-t-none border-t-0 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="trade-ticker" className="label">Ticker *</label>
                  <input
                    id="trade-ticker"
                    type="text"
                    value={form.ticker}
                    onChange={(e) => setField("ticker", e.target.value)}
                    className="input-field"
                    placeholder="e.g., AAPL"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="trade-strategy" className="label">Strategy</label>
                  <input
                    id="trade-strategy"
                    type="text"
                    value={form.strategy}
                    onChange={(e) => setField("strategy", e.target.value)}
                    className="input-field"
                    placeholder="e.g., Put Credit Spread"
                  />
                </div>
                <div>
                  <label htmlFor="trade-position" className="label">Position *</label>
                  <select
                    id="trade-position"
                    value={form.positionType}
                    onChange={(e) => setField("positionType", e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Select</option>
                    <option value="CALL">Call</option>
                    <option value="PUT">Put</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="trade-entry-date" className="label">Entry Date *</label>
                  <input
                    id="trade-entry-date"
                    type="date"
                    value={form.entryDate}
                    onChange={(e) => setField("entryDate", e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="trade-strike" className="label">Strike Price</label>
                  <input
                    id="trade-strike"
                    type="number"
                    step="0.5"
                    min={0}
                    value={form.strike}
                    onChange={(e) => setField("strike", e.target.value)}
                    className="input-field"
                    placeholder="e.g., 701"
                  />
                </div>
                <div>
                  <label htmlFor="trade-expiry" className="label">Expiry</label>
                  <input
                    id="trade-expiry"
                    type="date"
                    value={form.expiry}
                    onChange={(e) => setField("expiry", e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="trade-entry-time" className="label">Entry Time</label>
                  <input
                    id="trade-entry-time"
                    type="time"
                    value={form.entryTime}
                    onChange={(e) => setField("entryTime", e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="trade-sell-date" className="label">Sell Date</label>
                  <input
                    id="trade-sell-date"
                    type="date"
                    value={form.sellDate}
                    onChange={(e) => setField("sellDate", e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="trade-exit-time" className="label">Exit Time</label>
                  <input
                    id="trade-exit-time"
                    type="time"
                    value={form.exitTime}
                    onChange={(e) => setField("exitTime", e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Buy Fills */}
              <FillsSection
                label="Buy Fills"
                fills={form.buyFills}
                side="buyFills"
                onUpdate={updateFill}
                onAdd={addFillRow}
                onRemove={removeFillRow}
              />

              {/* Sell Fills */}
              <FillsSection
                label="Sell Fills"
                fills={form.sellFills}
                side="sellFills"
                onUpdate={updateFill}
                onAdd={addFillRow}
                onRemove={removeFillRow}
              />

              <div>
                <label htmlFor="trade-notes" className="label">Notes</label>
                <textarea
                  id="trade-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  className="input-field resize-none"
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <label htmlFor="trade-chart" className="label">Chart Image (optional)</label>
                <input
                  id="trade-chart"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setChartFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4
                             file:rounded-lg file:border-0 file:text-sm file:font-medium
                             file:bg-surface-300 file:text-gray-200 hover:file:bg-surface-400
                             file:cursor-pointer file:transition-colors"
                />
                {chartFile && (
                  <p className="text-xs text-gray-500 mt-1">
                    {chartFile.name} ({Math.round(chartFile.size / 1024)} KB)
                  </p>
                )}
                {usage && !usage.isPro && (
                  <p className="text-xs text-gray-500 mt-1">
                    {usage.chart.used >= usage.chart.limit ? (
                      <>AI chart analysis limit reached. <a href="/account" className="text-accent-light hover:text-accent">Upgrade to Pro</a></>
                    ) : (
                      <>{usage.chart.limit - usage.chart.used} free AI chart analyses remaining</>
                    )}
                  </p>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                {loading ? "Submitting..." : "Add Trade"}
              </button>
            </form>
          )}
        </div>

        {/* ── RIGHT: Trade list ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Recent Trades
              {totalCount != null && totalCount > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-2">({totalCount})</span>
              )}
            </h2>
          </div>
          <div className="space-y-3">
            {trades.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-gray-500 mb-2">No trades recorded yet.</p>
                <p className="text-sm text-gray-600">
                  Import a CSV or log your first trade manually.
                </p>
              </div>
            ) : (
              <>
                {trades.map((t) => (
                  <TradeCard
                    key={t.id}
                    trade={t}
                    deleting={deletingId === t.id}
                    onDelete={handleDelete}
                  />
                ))}
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-1" />
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!nextCursor && trades.length > 0 && (
                  <p className="text-center text-xs text-gray-600 py-2">All trades loaded</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function FillsSection({
  label,
  fills,
  side,
  onUpdate,
  onAdd,
  onRemove,
}: {
  label: string;
  fills: Fill[];
  side: "buyFills" | "sellFills";
  onUpdate: (s: "buyFills" | "sellFills", i: number, k: keyof Fill, v: string) => void;
  onAdd: (s: "buyFills" | "sellFills") => void;
  onRemove: (s: "buyFills" | "sellFills", i: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0">{label}</label>
        <button
          type="button"
          onClick={() => onAdd(side)}
          className="text-accent-light hover:text-accent text-sm font-medium transition-colors"
        >
          + Add Fill
        </button>
      </div>
      <div className="space-y-2">
        {fills.map((f, i) => (
          <div key={`${side}-${i}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              type="number"
              min={1}
              placeholder="Contracts"
              value={f.qty}
              onChange={(e) => onUpdate(side, i, "qty", e.target.value)}
              className="input-field"
              aria-label={`${label} row ${i + 1} contracts`}
            />
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Price"
              value={f.price}
              onChange={(e) => onUpdate(side, i, "price", e.target.value)}
              className="input-field"
              aria-label={`${label} row ${i + 1} price`}
            />
            <button
              type="button"
              onClick={() => onRemove(side, i)}
              className="btn-ghost text-gray-500 hover:text-red-400 px-2"
              aria-label={`Remove ${label.toLowerCase()} row ${i + 1}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      {side === "buyFills" && (
        <p className="text-xs text-gray-600 mt-1">
          Options quotes use a 100x multiplier (0.01 = $1).
        </p>
      )}
    </div>
  );
}

function TradeCard({
  trade: t,
  deleting,
  onDelete,
}: {
  trade: Trade;
  deleting: boolean;
  onDelete: (id: string) => void;
}) {
  const borderColor =
    t.outcome === "PROFIT"
      ? "border-profit/30"
      : t.outcome === "LOSS"
        ? "border-loss/30"
        : "border-surface-300";

  const bgTint =
    t.outcome === "PROFIT"
      ? "bg-profit-muted"
      : t.outcome === "LOSS"
        ? "bg-loss-muted"
        : "bg-surface-100";

  const displayType = t.optionType || t.positionType;
  const posBadge =
    displayType === "CALL" || t.positionType === "LONG"
      ? "bg-profit/15 text-profit"
      : "bg-loss/15 text-loss";

  return (
    <div className={`p-4 rounded-xl border ${borderColor} ${bgTint}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-white text-lg">{t.ticker}</h3>
          {t.strike && (
            <span className="text-sm text-accent-light font-medium">
              {t.strike} {displayType}
              {t.expiry ? ` (${fmtDate(t.expiry)})` : ""}
            </span>
          )}
          {t.strategy && (
            <span className="text-sm text-gray-500">{t.strategy}</span>
          )}
        </div>
        <span className={`badge ${posBadge}`}>{displayType}</span>
      </div>

      <p className="text-gray-400 text-sm mb-2">
        {fmtDate(t.entryDate)}{t.entryTime ? ` ${t.entryTime}` : ""}
        {t.sellDate ? ` → ${fmtDate(t.sellDate)}${t.exitTime ? ` ${t.exitTime}` : ""}` : ""}
      </p>

      <div className="grid grid-cols-2 gap-x-6 text-sm">
        <div className="space-y-0.5">
          <p className="text-gray-500">
            Bought: {t.totalBuyQty ?? 0} @ {fmtPrice(t.avgBuyPrice)}
          </p>
          <p className="text-gray-500">
            Sold: {t.totalSellQty ?? 0} @ {fmtPrice(t.avgSellPrice)}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="font-medium text-gray-200">
            P&L: {fmtUSD(t.realizedPnl)}
          </p>
          {t.outcome && (
            <p
              className={
                t.outcome === "PROFIT" ? "text-profit" : "text-loss"
              }
            >
              {t.outcome === "PROFIT" ? "Profit" : "Loss"}
            </p>
          )}
        </div>
      </div>

      {t.aiAnalysis && (
        <div className="mt-3 p-3 rounded-lg bg-surface-200/50 border border-surface-300">
          <p className="text-xs font-semibold text-accent-light mb-1">
            AI Analysis
          </p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {t.aiAnalysis}
          </p>
        </div>
      )}

      {t.notes && (
        <p className="text-gray-500 text-sm mt-2 italic">{t.notes}</p>
      )}

      <div className="mt-3">
        <button
          onClick={() => onDelete(t.id)}
          disabled={deleting}
          className="btn-danger disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
