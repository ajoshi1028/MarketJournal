// app/components/OptionsProfitLoss.tsx
"use client";

import { useMemo, useState } from "react";

export default function OptionsProfitLoss() {
  const [contracts, setContracts] = useState<string>("");
  const [entry, setEntry] = useState<string>("");
  const [tpPct, setTpPct] = useState<string>("");
  const [slPct, setSlPct] = useState<string>("");

  const n = (v: string) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const {
    entryNum,
    contractsNum,
    tpPrice,
    slPrice,
    posCost,
    tpDollars,
    slDollars,
  } = useMemo(() => {
    const contractsNum = Math.max(0, Math.floor(n(contracts)));
    const entryNum = Math.max(0, n(entry));
    const tpPctNum = Math.max(0, n(tpPct));
    const slPctNum = Math.max(0, n(slPct));

    const tpPrice = entryNum * (1 + tpPctNum / 100);
    const slPrice = Math.max(0, entryNum * (1 - slPctNum / 100));

    const mult = 100;
    const posCost = entryNum * mult * contractsNum;

    const tpPerContract = (tpPrice - entryNum) * mult;
    const slPerContract = (entryNum - slPrice) * mult;

    const tpDollars = tpPerContract * contractsNum;
    const slDollars = slPerContract * contractsNum;

    return { entryNum, contractsNum, tpPrice, slPrice, posCost, tpDollars, slDollars };
  }, [contracts, entry, tpPct, slPct]);

  const fmt = (v: number) =>
    isNaN(v) ? "—" : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow border ">
      <h2 className="text-xl font-semibold">Options P&amp;L Calculator</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Contracts
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={contracts}
            onChange={(e) => setContracts(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Entry Price (per contract)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 0.75"
          />
          <p className="text-xs text-gray-500 mt-1">Note: 0.01 = $1 (×100 multiplier)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Take Profit (%)
          </label>
          <input
            type="number"
            min={0}
            step="0.1"
            value={tpPct}
            onChange={(e) => setTpPct(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stop Loss (%)
          </label>
          <input
            type="number"
            min={0}
            step="0.1"
            value={slPct}
            onChange={(e) => setSlPct(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 30"
          />
        </div>
      </div>

      {(contracts && entry && tpPct && slPct) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-3">Target Contract Prices</h3>
              <div className="flex justify-between text-sm">
                <span>Take Profit price</span>
                <span className="font-semibold">${fmt(tpPrice)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>Stop Loss price</span>
                <span className="font-semibold">${fmt(slPrice)}</span>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-3">Profit / Loss (Total)</h3>
              <div className="flex justify-between text-sm">
                <span>At Take Profit</span>
                <span className="font-semibold text-green-700">+${fmt(tpDollars)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>At Stop Loss</span>
                <span className="font-semibold text-red-700">-${fmt(slDollars)}</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Position cost: <span className="font-semibold">${fmt(posCost)}</span>
            <span className="ml-2">(contracts × entry × 100)</span>
          </div>
        </>
      )}
    </div>
  );
}
