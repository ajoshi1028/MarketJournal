// lib/trade-pipeline.ts
// Shared pipeline that turns broker-agnostic "fills" into MarketJournal
// TradeEntry rows. Used by both CSV import and the SnapTrade broker sync so
// trades from every source are grouped and mapped identically.

import crypto from "crypto";

export type Side = "BUY" | "SELL";

export type CanonicalFill = {
  broker: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  instrument: string; // e.g. "QQQ"
  description: string | null; // e.g. "QQQ 11/10/2025 Put 616.00"
  side: Side;
  quantity: number;
  price: number;
  amount: number; // +credit for sells, -debit for buys (incl. fees if available)
  tradeDate: Date;
};

type Fill = { qty: number; price: number };

type Group = {
  key: string;
  ticker: string;
  description: string | null;
  buys: Fill[];
  sells: Fill[];
  firstBuyDate: Date | null;
  lastSellDate: Date | null;
  netAmount: number;
};

function weightedAvg(fills: Fill[]): number | null {
  const totalQty = fills.reduce((s, f) => s + f.qty, 0);
  if (totalQty === 0) return null;
  const value = fills.reduce((s, f) => s + f.price * f.qty, 0);
  return value / totalQty;
}

function parseDate(str: string | undefined | null): Date | null {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;
  const parts = s.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const mm = Number(a);
    const dd = Number(b);
    const yyyy = Number(c.length === 2 ? "20" + c : c);
    if (!Number.isNaN(mm) && !Number.isNaN(dd) && !Number.isNaN(yyyy)) {
      const d = new Date(yyyy, mm - 1, dd);
      if (!Number.isNaN(+d)) return d;
    }
  }
  const d = new Date(s);
  return Number.isNaN(+d) ? null : d;
}

export function parseOptionFromDesc(desc: string | null): {
  optionType: "CALL" | "PUT" | null;
  strike: number | null;
  expiry: Date | null;
} {
  if (!desc) return { optionType: null, strike: null, expiry: null };
  const callMatch = /\bCall\b/i.test(desc);
  const putMatch = /\bPut\b/i.test(desc);
  const optionType = callMatch
    ? ("CALL" as const)
    : putMatch
      ? ("PUT" as const)
      : null;

  let strike: number | null = null;
  const strikeMatch = desc.match(/(?:Call|Put)\s+\$?([\d,]+(?:\.\d+)?)/i);
  if (strikeMatch) {
    strike = parseFloat(strikeMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(strike)) strike = null;
  }

  const dateMatch = desc.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  let expiry: Date | null = null;
  if (dateMatch) expiry = parseDate(dateMatch[1]);

  return { optionType, strike, expiry };
}

export type BuiltTrade = {
  userId: string;
  ticker: string;
  strategy: string | null;
  positionType: "LONG" | "SHORT";
  optionType: "CALL" | "PUT" | null;
  strike: number | null;
  expiry: Date | null;
  entryDate: Date;
  sellDate: Date | null;
  buyFills: Fill[] | undefined;
  sellFills: Fill[] | undefined;
  totalBuyQty: number;
  totalSellQty: number;
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
  realizedPnl: number;
  outcome: "PROFIT" | "LOSS" | null;
  notes: string | null;
  // Deterministic fingerprint used to de-duplicate across repeated syncs.
  syncHash: string;
};

/**
 * Group canonical fills into trades and shape them into TradeEntry rows.
 * Pure function — does no DB work, so it's trivially testable and reusable.
 */
export function buildTradesFromFills(
  fills: CanonicalFill[],
  userId: string,
): BuiltTrade[] {
  const groups = new Map<string, Group>();

  for (const f of fills) {
    const desc = f.description ?? "";
    const key = `${f.instrument}|${desc}`;

    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        ticker: f.instrument,
        description: f.description,
        buys: [],
        sells: [],
        firstBuyDate: null,
        lastSellDate: null,
        netAmount: 0,
      };
      groups.set(key, g);
    }

    g.netAmount += f.amount;
    const fill: Fill = { qty: f.quantity, price: f.price };

    if (f.side === "BUY") {
      g.buys.push(fill);
      if (!g.firstBuyDate || f.tradeDate < g.firstBuyDate) {
        g.firstBuyDate = f.tradeDate;
      }
    } else {
      g.sells.push(fill);
      if (!g.lastSellDate || f.tradeDate > g.lastSellDate) {
        g.lastSellDate = f.tradeDate;
      }
    }
  }

  const trades: BuiltTrade[] = [];

  for (const g of groups.values()) {
    const totalBuyQty = g.buys.reduce((s, f) => s + f.qty, 0);
    const totalSellQty = g.sells.reduce((s, f) => s + f.qty, 0);
    if (totalBuyQty === 0 && totalSellQty === 0) continue;

    const avgBuyPrice = weightedAvg(g.buys);
    const avgSellPrice = weightedAvg(g.sells);
    const realizedPnl = g.netAmount;

    let outcome: "PROFIT" | "LOSS" | null = null;
    if (realizedPnl > 0) outcome = "PROFIT";
    else if (realizedPnl < 0) outcome = "LOSS";

    const { optionType, strike, expiry } = parseOptionFromDesc(g.description);
    const positionType: "LONG" | "SHORT" =
      optionType === "PUT" ? "SHORT" : "LONG";

    const entryDate = g.firstBuyDate ?? g.lastSellDate ?? new Date();
    const sellDate = g.lastSellDate ?? g.firstBuyDate ?? null;

    const syncHash = crypto
      .createHash("sha256")
      .update(
        [
          userId,
          g.ticker,
          g.description ?? "",
          entryDate.toISOString().slice(0, 10),
          sellDate ? sellDate.toISOString().slice(0, 10) : "",
          totalBuyQty,
          totalSellQty,
          realizedPnl.toFixed(2),
        ].join("|"),
      )
      .digest("hex");

    trades.push({
      userId,
      ticker: g.ticker,
      strategy: g.description?.slice(0, 80) ?? null,
      positionType,
      optionType,
      strike,
      expiry,
      entryDate,
      sellDate,
      buyFills: g.buys.length ? g.buys : undefined,
      sellFills: g.sells.length ? g.sells : undefined,
      totalBuyQty,
      totalSellQty,
      avgBuyPrice,
      avgSellPrice,
      realizedPnl,
      outcome,
      notes: g.description,
      syncHash,
    });
  }

  return trades;
}
