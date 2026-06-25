/**
 * Shared trade math — the single source of truth for fill parsing,
 * weighted-average pricing, and realized P&L.
 *
 * Two realized-P&L philosophies exist in the app, and they are
 * intentionally different because the available data differs:
 *
 *  - Manual entry (POST /api/trades) has no broker cash/fee data, so it
 *    derives P&L from average fill prices via computeRealizedPnl().
 *  - CSV import (POST /api/import-trades) has the broker's signed cash
 *    amount per fill (fees included), so it sums those into a net amount
 *    instead — a more accurate figure when that data is present.
 *
 * Both paths share the Fill shape and weightedAvg() below, so the pricing
 * math has one definition.
 */

export type Fill = { qty: number; price: number };

/** Max fills accepted per side on a single trade (abuse / payload guard). */
export const MAX_FILLS = 50;

/** Options contract multiplier — one contract controls 100 shares. */
export const CONTRACT_MULTIPLIER = 100;

/**
 * Coerce untrusted input (JSON body, form field) into a clean Fill[].
 * Drops anything non-finite, non-positive qty, or negative price, and
 * caps the count at MAX_FILLS.
 */
export function parseFills(raw: unknown): Fill[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_FILLS)
    .map((f) => ({ qty: Number(f?.qty), price: Number(f?.price) }))
    .filter(
      (f) =>
        Number.isFinite(f.qty) &&
        f.qty > 0 &&
        Number.isFinite(f.price) &&
        f.price >= 0,
    );
}

/** Quantity-weighted average price across fills, or null if no quantity. */
export function weightedAvg(fills: Fill[]): number | null {
  const totalQty = fills.reduce((s, f) => s + f.qty, 0);
  if (totalQty === 0) return null;
  return fills.reduce((s, f) => s + f.price * f.qty, 0) / totalQty;
}

/**
 * Realized P&L derived purely from average fill prices. Used when no
 * broker cash/fee data is available (manual entry). Returns 0 for an
 * open or one-sided position.
 */
export function computeRealizedPnl(buys: Fill[], sells: Fill[]): number {
  const buyQty = buys.reduce((s, f) => s + f.qty, 0);
  const sellQty = sells.reduce((s, f) => s + f.qty, 0);
  const avgBuy = weightedAvg(buys);
  const avgSell = weightedAvg(sells);
  if (!avgBuy || !avgSell || buyQty === 0 || sellQty === 0) return 0;
  return (avgSell - avgBuy) * CONTRACT_MULTIPLIER * Math.min(buyQty, sellQty);
}
