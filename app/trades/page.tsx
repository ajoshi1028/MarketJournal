"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
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
  positionType: "" | "LONG" | "SHORT";
  optionType: "" | "CALL" | "PUT";
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
  optionType: "",
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

const fmtUSD = (n: number | null | undefined) =>
  typeof n === "number"
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "—";

const fmtPrice = (p?: number | null) =>
  typeof p === "number" ? p.toFixed(2) : "—";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  // Parse as UTC to avoid timezone shift
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${m}/${d}/${y}`;
};

export default function TradesPage() {
  const { user, isLoaded } = useUser();

  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) fetchTrades();
  }, [isLoaded, user]);

  async function fetchTrades() {
    try {
      const res = await fetch("/api/trades", { cache: "no-store" });
      if (!res.ok) {
        setLoadError(`${res.status} ${res.statusText}`);
        return;
      }
      const data = await res.json();
      setTrades(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Network error");
    }
  }

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
      fd.append("positionType", form.positionType);
      if (form.optionType) fd.append("optionType", form.optionType);
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
      await fetchTrades();
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
      await fetchTrades();
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
      {loadError && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm">
          Failed to load trades: {loadError}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* ---- FORM ---- */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-5">New Trade</h2>
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Ticker *</label>
                <input
                  type="text"
                  value={form.ticker}
                  onChange={(e) => setField("ticker", e.target.value)}
                  className="input-field"
                  placeholder="e.g., AAPL"
                  required
                />
              </div>
              <div>
                <label className="label">Strategy</label>
                <input
                  type="text"
                  value={form.strategy}
                  onChange={(e) => setField("strategy", e.target.value)}
                  className="input-field"
                  placeholder="e.g., Put Credit Spread"
                />
              </div>
              <div>
                <label className="label">Position Type *</label>
                <select
                  value={form.positionType}
                  onChange={(e) => setField("positionType", e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select</option>
                  <option value="LONG">Long</option>
                  <option value="SHORT">Short</option>
                </select>
              </div>
              <div>
                <label className="label">Entry Date *</label>
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => setField("entryDate", e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Option Type</label>
                <select
                  value={form.optionType}
                  onChange={(e) => setField("optionType", e.target.value)}
                  className="input-field"
                >
                  <option value="">N/A</option>
                  <option value="CALL">Call</option>
                  <option value="PUT">Put</option>
                </select>
              </div>
              <div>
                <label className="label">Strike Price</label>
                <input
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
                <label className="label">Expiry</label>
                <input
                  type="date"
                  value={form.expiry}
                  onChange={(e) => setField("expiry", e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Entry Time</label>
                <input
                  type="time"
                  value={form.entryTime}
                  onChange={(e) => setField("entryTime", e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Sell Date</label>
                <input
                  type="date"
                  value={form.sellDate}
                  onChange={(e) => setField("sellDate", e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Exit Time</label>
                <input
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
              <label className="label">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className="input-field resize-none"
                placeholder="Additional notes..."
              />
            </div>

            <div>
              <label className="label">Chart Image (optional)</label>
              <input
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
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? "Submitting..." : "Add Trade"}
            </button>
          </form>
        </div>

        {/* ---- TRADE LIST ---- */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-5">Recent Trades</h2>
          <div className="space-y-4">
            {trades.length === 0 ? (
              <p className="text-gray-500">No trades recorded yet.</p>
            ) : (
              trades.map((t) => (
                <TradeCard
                  key={t.id}
                  trade={t}
                  deleting={deletingId === t.id}
                  onDelete={handleDelete}
                />
              ))
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
            />
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Price"
              value={f.price}
              onChange={(e) => onUpdate(side, i, "price", e.target.value)}
              className="input-field"
            />
            <button
              type="button"
              onClick={() => onRemove(side, i)}
              className="btn-ghost text-gray-500 hover:text-red-400 px-2"
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

  const posBadge =
    t.positionType === "LONG"
      ? "bg-profit/15 text-profit"
      : "bg-loss/15 text-loss";

  return (
    <div className={`p-4 rounded-xl border ${borderColor} ${bgTint}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-white text-lg">{t.ticker}</h3>
          {t.optionType && t.strike && (
            <span className="text-sm text-accent-light font-medium">
              {t.strike} {t.optionType}
              {t.expiry ? ` (${fmtDate(t.expiry)})` : ""}
            </span>
          )}
          {t.strategy && (
            <span className="text-sm text-gray-500">{t.strategy}</span>
          )}
        </div>
        <span className={`badge ${posBadge}`}>{t.positionType}</span>
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
