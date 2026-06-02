// lib/snaptrade.ts
// Thin wrapper around the SnapTrade SDK. SnapTrade is a brokerage aggregator
// that supports Robinhood, Webull, and many others — users connect their
// brokerage through SnapTrade's hosted portal, so we never touch their
// brokerage credentials.
//
// Required env vars:
//   SNAPTRADE_CLIENT_ID
//   SNAPTRADE_CONSUMER_KEY

import { Snaptrade } from "snaptrade-typescript-sdk";
import type { UniversalActivity } from "snaptrade-typescript-sdk";
import type { CanonicalFill } from "@/lib/trade-pipeline";

let _client: Snaptrade | null = null;

export function getSnapTrade(): Snaptrade {
  if (!_client) {
    const clientId = process.env.SNAPTRADE_CLIENT_ID;
    const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
    if (!clientId || !consumerKey) {
      throw new Error(
        "SnapTrade is not configured (missing SNAPTRADE_CLIENT_ID / SNAPTRADE_CONSUMER_KEY).",
      );
    }
    _client = new Snaptrade({ clientId, consumerKey });
  }
  return _client;
}

/**
 * Register a SnapTrade user (idempotent-ish: SnapTrade returns the existing
 * secret if the userId already exists). Returns the userSecret to persist.
 */
export async function registerSnapTradeUser(userId: string): Promise<string> {
  const snaptrade = getSnapTrade();
  const res = await snaptrade.authentication.registerSnapTradeUser({ userId });
  const secret = res.data?.userSecret;
  if (!secret) throw new Error("SnapTrade did not return a userSecret.");
  return secret;
}

/**
 * Generate a one-time hosted connection-portal URL. Redirect the user here to
 * link Robinhood / Webull / etc. `customRedirect` is where SnapTrade sends them
 * back after a successful connection.
 */
export async function getConnectionPortalUrl(
  userId: string,
  userSecret: string,
  customRedirect?: string,
): Promise<string> {
  const snaptrade = getSnapTrade();
  const res = await snaptrade.authentication.loginSnapTradeUser({
    userId,
    userSecret,
    ...(customRedirect ? { customRedirect } : {}),
  });
  // The login response is a union; the redirect form has a redirectURI.
  const data = res.data as { redirectURI?: string } | undefined;
  if (!data?.redirectURI) {
    throw new Error("SnapTrade did not return a connection URL.");
  }
  return data.redirectURI;
}

/** Pull all transaction activities for a connected SnapTrade user. */
export async function getActivities(
  userId: string,
  userSecret: string,
  startDate?: string,
): Promise<UniversalActivity[]> {
  const snaptrade = getSnapTrade();
  const res = await snaptrade.transactionsAndReporting.getActivities({
    userId,
    userSecret,
    ...(startDate ? { startDate } : {}),
  });
  return res.data ?? [];
}

/**
 * Map SnapTrade UniversalActivity rows into our broker-agnostic CanonicalFill
 * shape so they flow through the exact same grouping pipeline as CSV imports.
 */
export function mapActivitiesToFills(
  activities: UniversalActivity[],
): CanonicalFill[] {
  const fills: CanonicalFill[] = [];

  for (const a of activities) {
    const type = String(a.type ?? "").toUpperCase();
    // Only trade fills; skip dividends, fees, transfers, etc.
    if (type !== "BUY" && type !== "SELL") continue;

    const qty = typeof a.units === "number" ? Math.abs(a.units) : 0;
    const price = typeof a.price === "number" ? a.price : 0;
    if (!qty || !price) continue;

    const side: "BUY" | "SELL" = type === "BUY" ? "BUY" : "SELL";

    // SnapTrade amount: negative for buys, positive for sells (matches our
    // convention). Fall back to qty*price if missing.
    let amount =
      typeof a.amount === "number" && a.amount !== 0
        ? a.amount
        : side === "BUY"
          ? -(qty * price)
          : qty * price;
    // Some brokers report option amounts un-multiplied; trust SnapTrade's
    // amount when present and only synthesize when absent.
    if (typeof a.amount === "number" && a.amount !== 0) amount = a.amount;

    let instrument: string;
    let description: string | null;

    if (a.option_symbol) {
      const opt = a.option_symbol;
      const underlying =
        opt.underlying_symbol?.raw_symbol ??
        opt.underlying_symbol?.symbol ??
        opt.ticker ??
        "";
      instrument = String(underlying).toUpperCase();
      // Build a description matching our CSV format so parseOptionFromDesc
      // extracts type/strike/expiry: "QQQ 5/21/2026 Put 712.00"
      const expiry = opt.expiration_date
        ? new Date(opt.expiration_date)
        : null;
      const expStr = expiry
        ? `${expiry.getMonth() + 1}/${expiry.getDate()}/${expiry.getFullYear()}`
        : "";
      const typeWord = opt.option_type === "CALL" ? "Call" : "Put";
      const strike =
        typeof opt.strike_price === "number" ? opt.strike_price : "";
      description = `${instrument} ${expStr} ${typeWord} ${strike}`.trim();
    } else {
      const sym = a.symbol;
      instrument = String(
        sym?.raw_symbol ?? sym?.symbol ?? "",
      ).toUpperCase();
      description = sym?.description ?? instrument;
    }

    if (!instrument) continue;

    const dateStr = a.trade_date ?? a.settlement_date ?? null;
    const tradeDate = dateStr ? new Date(dateStr) : new Date();

    fills.push({
      broker: "SnapTrade",
      raw: a,
      instrument,
      description,
      side,
      quantity: qty,
      price,
      amount,
      tradeDate: Number.isNaN(+tradeDate) ? new Date() : tradeDate,
    });
  }

  return fills;
}
