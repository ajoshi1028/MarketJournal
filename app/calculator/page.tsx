"use client";

import { useMemo, useState } from "react";

export default function CalculatorPage() {
  const [contracts, setContracts] = useState("");
  const [entry, setEntry] = useState("");
  const [tpPct, setTpPct] = useState("");
  const [slPct, setSlPct] = useState("");

  const n = (v: string) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const { tpPrice, slPrice, posCost, tpDollars, slDollars, riskReward } =
    useMemo(() => {
      const c = Math.max(0, Math.floor(n(contracts)));
      const e = Math.max(0, n(entry));
      const tp = Math.max(0, n(tpPct));
      const sl = Math.max(0, n(slPct));

      const tpPrice = e * (1 + tp / 100);
      const slPrice = Math.max(0, e * (1 - sl / 100));

      const mult = 100;
      const posCost = e * mult * c;
      const tpDollars = (tpPrice - e) * mult * c;
      const slDollars = (e - slPrice) * mult * c;

      const riskReward = slDollars > 0 ? tpDollars / slDollars : 0;

      return { tpPrice, slPrice, posCost, tpDollars, slDollars, riskReward };
    }, [contracts, entry, tpPct, slPct]);

  const fmt = (v: number) =>
    isNaN(v)
      ? "—"
      : v.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  const hasInput = contracts && entry && tpPct && slPct;

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">Risk Calculator</h1>
        <p className="text-gray-500">
          Calculate potential P&L and position sizing for options trades.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="calc-contracts" className="label">Number of Contracts</label>
            <input
              id="calc-contracts"
              type="number"
              min={0}
              step={1}
              value={contracts}
              onChange={(e) => setContracts(e.target.value)}
              className="input-field"
              placeholder="e.g., 2"
            />
          </div>
          <div>
            <label htmlFor="calc-entry" className="label">Entry Price (per contract)</label>
            <input
              id="calc-entry"
              type="number"
              min={0}
              step="0.01"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              className="input-field"
              placeholder="e.g., 0.75"
            />
            <p className="text-xs text-gray-600 mt-1">
              0.01 = $1 (100x multiplier)
            </p>
          </div>
          <div>
            <label htmlFor="calc-tp" className="label">Take Profit (%)</label>
            <input
              id="calc-tp"
              type="number"
              min={0}
              step="0.1"
              value={tpPct}
              onChange={(e) => setTpPct(e.target.value)}
              className="input-field"
              placeholder="e.g., 50"
            />
          </div>
          <div>
            <label htmlFor="calc-sl" className="label">Stop Loss (%)</label>
            <input
              id="calc-sl"
              type="number"
              min={0}
              step="0.1"
              value={slPct}
              onChange={(e) => setSlPct(e.target.value)}
              className="input-field"
              placeholder="e.g., 30"
            />
          </div>
        </div>

        {hasInput && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl bg-surface-200 border border-surface-300 p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">
                  Target Prices
                </h3>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Take Profit</span>
                  <span className="font-mono font-semibold text-profit">
                    ${fmt(tpPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Stop Loss</span>
                  <span className="font-mono font-semibold text-loss">
                    ${fmt(slPrice)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-surface-200 border border-surface-300 p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">
                  Profit / Loss
                </h3>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">At Take Profit</span>
                  <span className="font-mono font-semibold text-profit">
                    +${fmt(tpDollars)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">At Stop Loss</span>
                  <span className="font-mono font-semibold text-loss">
                    -${fmt(slDollars)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
              <div>
                Position cost:{" "}
                <span className="font-mono font-semibold text-gray-200">
                  ${fmt(posCost)}
                </span>
              </div>
              {riskReward > 0 && (
                <div>
                  Risk/Reward:{" "}
                  <span className="font-mono font-semibold text-accent-light">
                    1:{fmt(riskReward)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
