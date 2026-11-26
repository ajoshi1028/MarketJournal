/**
 * Turns broker fills into journal positions: grouping, open/closed status,
 * realized P&L, and a stable import key so re-importing the same history
 * updates trades instead of duplicating them. Pure — no I/O.
 */

import { createHash } from "crypto";
import { type Fill, weightedAvg } from "./trade-math";

export type Side = "BUY" | "SELL";

export type CanonicalFill = {
  instrument: string; // e.g. "QQQ"
  description: string | null; // e.g. "QQQ 11/10/2025 Put $616.00"
  side: Side;
  quantity: number;
  price: number;
  /** Signed cash: negative for buys, positive for sells, fees included. */
  amount: number;
  tradeDate: Date;
};

export type PositionStatus = "OPEN" | "CLOSED" | "EXPIRED";

export type ImportedTrade = {
  importKey: string;
  ticker: string;
  description: string | null;
  optionType: "CALL" | "PUT" | null;
  strike: number | null;
  expiry: Date | null;
  status: PositionStatus;
  entryDate: Date;
  sellDate: Date | null;
  firstBuyDate: Date | null;
  lastSellDate: Date | null;
  buyFills: Fill[];
  sellFills: Fill[];
  totalBuyQty: number;
  totalSellQty: number;
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
  /** Null while nothing has been closed yet. */
  realizedPnl: number | null;
  /** Only set once the position is fully closed or expired. */
  outcome: "PROFIT" | "LOSS" | null;
};

/** Parses MM/DD/YYYY, MM-DD-YY and similar broker dates; falls back to Date(). */
export function parseDate(str: string | undefined | null): Date | null {
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

/** Option details from a description like "QQQ 5/21/2026 Put $712.00". */
export function parseOptionFromDesc(desc: string | null): {
  optionType: "CALL" | "PUT" | null;
  strike: number | null;
  expiry: Date | null;
} {
  if (!desc) return { optionType: null, strike: null, expiry: null };
  const optionType = /\bCall\b/i.test(desc) ? "CALL" : /\bPut\b/i.test(desc) ? "PUT" : null;

  let strike: number | null = null;
  const strikeMatch = desc.match(/(?:Call|Put)\s+\$?([\d,]+(?:\.\d+)?)/i);
  if (strikeMatch) {
    strike = parseFloat(strikeMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(strike)) strike = null;
  }

  const dateMatch = desc.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  const expiry = dateMatch ? parseDate(dateMatch[1]) : null;

  return { optionType, strike, expiry };
}

/**
 * Local calendar day. Broker dates are parsed as local midnight, so a UTC
 * key would shift them back a day for anyone east of Greenwich.
 */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Identity of a position: same contract, first traded on the same day. */
export function makeImportKey(ticker: string, description: string | null, openedAt: Date): string {
  return createHash("sha256")
    .update(`${ticker}|${description ?? ""}|${dayKey(openedAt)}`)
    .digest("hex")
    .slice(0, 32);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Groups fills by contract and works out each position's state.
 *
 * Closed (bought qty = sold qty): realized P&L is the net cash, fees included.
 * Open: P&L is only the realized part — the closed quantity's cash plus a
 * prorated share of the opening side's cash — and there is no outcome yet.
 * Open but past expiry: the remainder expired worthless (an exercise or
 * assignment isn't in the fills, so an in-the-money expiry is approximated).
 */
export function buildImportedTrades(fills: CanonicalFill[], now: Date = new Date()): ImportedTrade[] {
  const groups = new Map<string, CanonicalFill[]>();
  for (const f of fills) {
    const key = `${f.instrument}|${f.description ?? ""}`;
    const list = groups.get(key);
    if (list) list.push(f);
    else groups.set(key, [f]);
  }

  const today = dayKey(now);
  const trades: ImportedTrade[] = [];

  for (const group of groups.values()) {
    const buys = group.filter((f) => f.side === "BUY");
    const sells = group.filter((f) => f.side === "SELL");
    const buyQty = sum(buys.map((f) => f.quantity));
    const sellQty = sum(sells.map((f) => f.quantity));
    if (buyQty === 0 && sellQty === 0) continue;

    const buyCash = sum(buys.map((f) => f.amount));
    const sellCash = sum(sells.map((f) => f.amount));
    const times = group.map((f) => f.tradeDate.getTime());
    const openedAt = new Date(Math.min(...times));
    const lastFillAt = new Date(Math.max(...times));

    const { instrument: ticker, description } = group[0];
    const { optionType, strike, expiry } = parseOptionFromDesc(description);

    let status: PositionStatus;
    let realizedPnl: number | null;
    let closedAt: Date | null;

    if (buyQty === sellQty) {
      status = "CLOSED";
      realizedPnl = buyCash + sellCash;
      closedAt = lastFillAt;
    } else if (expiry && dayKey(expiry) < today) {
      status = "EXPIRED";
      realizedPnl = buyCash + sellCash; // remainder closed at $0
      closedAt = expiry;
    } else {
      status = "OPEN";
      closedAt = null;
      const closedQty = Math.min(buyQty, sellQty);
      if (closedQty === 0) {
        realizedPnl = null;
      } else {
        const longOpen = buyQty > sellQty;
        const openingCash = longOpen ? buyCash : sellCash;
        const closingCash = longOpen ? sellCash : buyCash;
        const openingQty = longOpen ? buyQty : sellQty;
        realizedPnl = closingCash + openingCash * (closedQty / openingQty);
      }
    }

    let outcome: ImportedTrade["outcome"] = null;
    if (status !== "OPEN" && realizedPnl !== null) {
      if (realizedPnl > 0) outcome = "PROFIT";
      else if (realizedPnl < 0) outcome = "LOSS";
    }

    const toFills = (xs: CanonicalFill[]): Fill[] => xs.map((f) => ({ qty: f.quantity, price: f.price }));
    const buyFills = toFills(buys);
    const sellFills = toFills(sells);

    trades.push({
      importKey: makeImportKey(ticker, description, openedAt),
      ticker,
      description,
      optionType,
      strike,
      expiry,
      status,
      entryDate: openedAt,
      sellDate: closedAt,
      firstBuyDate: buys.length ? new Date(Math.min(...buys.map((f) => f.tradeDate.getTime()))) : null,
      lastSellDate: sells.length ? new Date(Math.max(...sells.map((f) => f.tradeDate.getTime()))) : null,
      buyFills,
      sellFills,
      totalBuyQty: buyQty,
      totalSellQty: sellQty,
      avgBuyPrice: weightedAvg(buyFills),
      avgSellPrice: weightedAvg(sellFills),
      realizedPnl,
      outcome,
    });
  }

  return trades;
}
