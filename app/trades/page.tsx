// app/trades/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

type Fill = { qty: string; price: string };

type Trade = {
  id: string;
  userId: string;
  ticker: string;
  strategy: string | null;
  positionType: "LONG" | "SHORT";
  entryDate: string;
  sellDate?: string | null;
  buyFills?: { qty: number; price: number }[] | null;
  sellFills?: { qty: number; price: number }[] | null;
  totalBuyQty?: number;
  totalSellQty?: number;
  avgBuyPrice?: number | null;
  avgSellPrice?: number | null;
  realizedPnl?: number | null;
  outcome?: "PROFIT" | "LOSS" | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type FormState = {
  ticker: string;
  strategy: string;
  positionType: "" | "LONG" | "SHORT";
  entryDate: string; // yyyy-mm-dd
  sellDate: string;  // yyyy-mm-dd
  buyFills: Fill[];
  sellFills: Fill[];
  notes: string;
};

export default function TradesPage() {
  const { user, isLoaded } = useUser();

  const [form, setForm] = useState<FormState>({
    ticker: "",
    strategy: "",
    positionType: "",
    entryDate: "",
    sellDate: "",
    buyFills: [{ qty: "", price: "" }],
    sellFills: [{ qty: "", price: "" }],
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) fetchTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  const fetchTrades = async () => {
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
    } catch (error: any) {
      setLoadError(`Network error: ${error?.message ?? error}`);
    }
  };

  const setField = (name: keyof FormState, value: any) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const updateFill = (
    side: "buyFills" | "sellFills",
    index: number,
    key: keyof Fill,
    value: string
  ) => {
    setForm((prev) => {
      const copy = [...prev[side]];
      copy[index] = { ...copy[index], [key]: value };
      return { ...prev, [side]: copy };
    });
  };

  const addFillRow = (side: "buyFills" | "sellFills") =>
    setForm((prev) => ({ ...prev, [side]: [...prev[side], { qty: "", price: "" }] }));

  const removeFillRow = (side: "buyFills" | "sellFills", idx: number) =>
    setForm((prev) => {
      const copy = [...prev[side]];
      copy.splice(idx, 1);
      return { ...prev, [side]: copy.length ? copy : [{ qty: "", price: "" }] };
    });

  const cleanFillsForPost = (fills: Fill) =>
    null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!form.positionType) {
        alert("Please choose a position type.");
        return;
      }
      if (!form.entryDate) {
        alert("Please select an entry date.");
        return;
      }
      if (!form.ticker.trim()) {
        alert("Please enter a ticker.");
        return;
      }

      const toArray = (ary: Fill[]) =>
        ary
          .map((f) => ({
            qty: Number(f.qty),
            price: Number(f.price),
          }))
          .filter(
            (f) =>
              Number.isFinite(f.qty) &&
              f.qty > 0 &&
              Number.isFinite(f.price) &&
              f.price >= 0
          );

      const payload = {
        ticker: form.ticker.trim().toUpperCase(),
        strategy: form.strategy.trim() || null,
        positionType: form.positionType as "LONG" | "SHORT",
        entryDate: new Date(form.entryDate).toISOString(),
        sellDate: form.sellDate ? new Date(form.sellDate).toISOString() : null,
        buyFills: toArray(form.buyFills),
        sellFills: toArray(form.sellFills),
        notes: form.notes.trim() || null,
      };

      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = text;
        try {
          const j = JSON.parse(text);
          msg = j?.error || j?.message || j?.details || text;
        } catch {}
        alert(`Submit failed: ${res.status} ${res.statusText}\n${msg}`);
        return;
      }

      await res.json();
      alert("Trade submitted successfully!");

      // Reset form
      setForm({
        ticker: "",
        strategy: "",
        positionType: "",
        entryDate: "",
        sellDate: "",
        buyFills: [{ qty: "", price: "" }],
        sellFills: [{ qty: "", price: "" }],
        notes: "",
      });

      fetchTrades();
    } catch (err) {
      console.log(err);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  async function handleDelete(id: string) {
    if (!confirm("Delete this trade?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/trades?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        alert(`Failed to delete trade: ${data?.error || res.statusText}`);
        return;
      }
      setTrades((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      alert("Network error deleting trade.");
    } finally {
      setDeletingId(null);
    }
  }

  const fmtUSD = (n: number | null | undefined) =>
    typeof n === "number"
      ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
      : "—";

  const fmtPrice = (p?: number | null) =>
    typeof p === "number" ? p.toFixed(2) : "—"; // option quote price (0.70 = $70 per contract)

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(+d) ? "—" : d.toLocaleDateString();
  };

  if (!isLoaded) return <div className="max-w-6xl mx-auto p-8">Loading...</div>;

  return (
    <main className="max-w-6xl mx-auto p-8">
      {loadError && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-red-800">
          Failed to load trades: {loadError}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Add Trade Entry</h1>
            <p className="text-gray-600">
              Record buys/sells with multiple fills; P&L is computed automatically (multiplier 100).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ticker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ticker Symbol *</label>
                <input
                  type="text"
                  value={form.ticker}
                  onChange={(e) => setField("ticker", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., AAPL"
                  required
                />
              </div>

              {/* Strategy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Strategy</label>
                <input
                  type="text"
                  value={form.strategy}
                  onChange={(e) => setField("strategy", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Put Credit Spread"
                />
              </div>

              {/* Position Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position Type *</label>
                <select
                  value={form.positionType}
                  onChange={(e) => setField("positionType", e.target.value as any)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select position type</option>
                  <option value="LONG">Long</option>
                  <option value="SHORT">Short</option>
                </select>
              </div>

              {/* Entry / Sell Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entry Date *</label>
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => setField("entryDate", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sell Date</label>
                <input
                  type="date"
                  value={form.sellDate}
                  onChange={(e) => setField("sellDate", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Buy fills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Buy Fills (contracts & price)</label>
                <button
                  type="button"
                  onClick={() => addFillRow("buyFills")}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + Add Buy Fill
                </button>
              </div>
              <div className="space-y-2">
                {form.buyFills.map((f, i) => (
                  <div key={`buy-${i}`} className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Contracts (e.g., 10)"
                      value={f.qty}
                      onChange={(e) => updateFill("buyFills", i, "qty", e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Price (e.g., 0.70)"
                      value={f.price}
                      onChange={(e) => updateFill("buyFills", i, "price", e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeFillRow("buyFills", i)}
                      className="border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Reminder: options quotes use a 100x multiplier (0.01 = $1).
              </p>
            </div>

            {/* Sell fills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Sell Fills (contracts & price)</label>
                <button
                  type="button"
                  onClick={() => addFillRow("sellFills")}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + Add Sell Fill
                </button>
              </div>
              <div className="space-y-2">
                {form.sellFills.map((f, i) => (
                  <div key={`sell-${i}`} className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Contracts (e.g., 10)"
                      value={f.qty}
                      onChange={(e) => updateFill("sellFills", i, "qty", e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Price (e.g., 1.10)"
                      value={f.price}
                      onChange={(e) => updateFill("sellFills", i, "price", e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeFillRow("sellFills", i)}
                      className="border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes about this trade..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md transition-colors"
            >
              {loading ? "Submitting..." : "Add Trade"}
            </button>
          </form>
        </div>

        {/* Trades List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Trades</h2>
          <div className="space-y-4">
            {trades.length === 0 ? (
              <p className="text-gray-500">No trades recorded yet.</p>
            ) : (
              trades.map((t) => {
                const dateRange =
                  `${fmtDate(t.entryDate)}${
                    t.sellDate ? ` - ${fmtDate(t.sellDate)}` : ""
                  }`;

                const outcomeBox =
                  t.outcome === "PROFIT"
                    ? "bg-green-50 border-green-200"
                    : t.outcome === "LOSS"
                    ? "bg-red-50 border-red-200"
                    : "bg-white";

                const posBadge =
                  t.positionType === "LONG"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800";

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-lg shadow border ${outcomeBox}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{t.ticker}</h3>
                        {t.strategy && (
                          <span className="text-sm text-gray-600">• {t.strategy}</span>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${posBadge}`}>
                        {t.positionType}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-1">Date: {dateRange}</p>

                    <div className="grid grid-cols-2 gap-x-6 text-sm mt-2">
                      <div>
                        <p className="text-gray-600">
                          Bought: {t.totalBuyQty ?? 0} @ {fmtPrice(t.avgBuyPrice)}
                        </p>
                        <p className="text-gray-600">
                          Sold: {t.totalSellQty ?? 0} @ {fmtPrice(t.avgSellPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">
                          Realized P&amp;L: {fmtUSD(t.realizedPnl)}
                        </p>
                        {t.outcome && (
                          <p className="text-gray-700">
                            Outcome: {t.outcome === "PROFIT" ? "Profit" : "Loss"}
                          </p>
                        )}
                      </div>
                    </div>

                    {t.notes && (
                      <p className="text-gray-500 text-sm mt-2">{t.notes}</p>
                    )}

                    <div className="mt-3">
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm px-3 py-1 rounded"
                      >
                        {deletingId === t.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
