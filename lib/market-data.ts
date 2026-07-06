/**
 * Free delayed options-chain data via CBOE's public delayed-quotes JSON,
 * plus the unusual-activity math computed from it.
 *
 * Same pattern as the Yahoo chart-data proxy: an unofficial-but-free
 * upstream, fetched server-side with a hard timeout, normalized into our
 * own types so the provider can be swapped (e.g. for Polygon) without
 * touching consumers. Chains are cached in Redis (lib/redis.ts) because
 * the routes serving them are auth-gated and must not be edge-cached.
 */

import { cachedJson } from "@/lib/redis";

/* CBOE serves indexes under an underscore prefix. */
const INDEX_SYMBOLS: Record<string, string> = {
  SPX: "_SPX",
  SPXW: "_SPX",
  NDX: "_NDX",
  RUT: "_RUT",
  VIX: "_VIX",
  OEX: "_OEX",
  XSP: "_XSP",
  DJX: "_DJX",
};

export type ChainContract = {
  contract: string; // e.g. AAPL251219C00190000
  type: "CALL" | "PUT";
  strike: number;
  expiry: string; // YYYY-MM-DD
  volume: number;
  openInterest: number;
  bid: number;
  ask: number;
  last: number;
  iv: number | null;
  gamma: number | null;
  vega: number | null;
  delta: number | null;
};

export type OptionsChain = {
  symbol: string;
  spot: number;
  fetchedAt: string;
  contracts: ChainContract[];
};

export type UnusualRow = {
  symbol: string;
  type: "CALL" | "PUT";
  strike: number;
  expiry: string;
  spot: number;
  otmPct: number; // signed % from spot to strike
  volume: number;
  openInterest: number;
  volOiRatio: number;
  estPremium: number; // volume × mid × 100
  iv: number | null;
};

/** Parse OCC-style option symbols: ROOT + YYMMDD + C/P + strike×1000. */
function parseOccSymbol(
  occ: string,
): { type: "CALL" | "PUT"; strike: number; expiry: string } | null {
  const m = occ.match(/^[A-Z.]{1,6}(\d{6})([CP])(\d{8})$/);
  if (!m) return null;
  const [, ymd, cp, strikeRaw] = m;
  const yy = Number(ymd.slice(0, 2));
  const mm = ymd.slice(2, 4);
  const dd = ymd.slice(4, 6);
  return {
    type: cp === "C" ? "CALL" : "PUT",
    strike: Number(strikeRaw) / 1000,
    expiry: `20${String(yy).padStart(2, "0")}-${mm}-${dd}`,
  };
}

async function fetchCboeChain(symbol: string): Promise<OptionsChain | null> {
  const cboeSymbol = INDEX_SYMBOLS[symbol] ?? symbol;
  const url = `https://cdn.cboe.com/api/global/delayed_quotes/options/${encodeURIComponent(cboeSymbol)}.json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data;
    const raw: unknown[] = Array.isArray(data?.options) ? data.options : [];
    const spot = Number(data?.current_price ?? data?.close);
    if (!Number.isFinite(spot) || raw.length === 0) return null;

    const contracts: ChainContract[] = [];
    for (const o of raw as Record<string, unknown>[]) {
      const occ = String(o?.option ?? "");
      const parsed = parseOccSymbol(occ);
      if (!parsed) continue;
      const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
      const numOrNull = (v: unknown): number | null =>
        Number.isFinite(Number(v)) ? Number(v) : null;
      contracts.push({
        contract: occ,
        ...parsed,
        volume: num(o.volume),
        openInterest: num(o.open_interest),
        bid: num(o.bid),
        ask: num(o.ask),
        last: num(o.last_trade_price),
        iv: numOrNull(o.iv),
        gamma: numOrNull(o.gamma),
        vega: numOrNull(o.vega),
        delta: numOrNull(o.delta),
      });
    }

    return {
      symbol,
      spot,
      fetchedAt: new Date().toISOString(),
      contracts,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Chain fetch with a 5-minute shared cache (delayed data changes slowly). */
export function getOptionsChain(symbol: string): Promise<OptionsChain | null> {
  return cachedJson(`chain:v1:${symbol}`, 300, () => fetchCboeChain(symbol));
}

export type GexStrikeRow = {
  strike: number;
  /** Net exposure per expiry column, aligned with GexProfile.expiries. */
  byExpiry: number[];
  net: number;
  callGex: number;
  putGex: number;
};

export type GexProfile = {
  symbol: string;
  spot: number;
  metric: "gex" | "vex";
  expiries: string[]; // column order, nearest first
  strikes: GexStrikeRow[]; // sorted descending (highest strike first)
  netTotal: number;
  /** Approximate zero-gamma flip level (cumulative net crossing), null if no flip. */
  zeroGamma: number | null;
  /** Max pain strike for the front expiry. */
  maxPain: number | null;
  frontExpiry: string | null;
  asOf: string;
};

const MAX_EXPIRIES = 8;
const MAX_STRIKES = 36;
const STRIKE_WINDOW_PCT = 0.12; // strikes within ±12% of spot

/**
 * Dealer-positioning exposure profile from a chain snapshot.
 *
 * GEX per contract = gamma × OI × 100 × spot² × 1% — dollar gamma per 1%
 * spot move. VEX per contract = vega × OI × 100 — dollars per vol point.
 * Convention: calls positive, puts negative (dealers assumed short puts /
 * long calls). Zero-gamma is the cumulative-net sign flip across strikes,
 * interpolated — an approximation of the "gamma flip" level.
 */
export function computeExposureProfile(
  chain: OptionsChain,
  metric: "gex" | "vex",
): GexProfile {
  const today = new Date().toISOString().slice(0, 10);
  const { spot } = chain;

  const live = chain.contracts.filter(
    (c) =>
      c.expiry >= today &&
      c.openInterest > 0 &&
      (metric === "gex" ? c.gamma != null : c.vega != null),
  );

  // Nearest expiries first, capped.
  const expiries = Array.from(new Set(live.map((c) => c.expiry)))
    .sort()
    .slice(0, MAX_EXPIRIES);
  const expiryIdx = new Map(expiries.map((e, i) => [e, i]));

  // Strikes near spot, thinned to the closest MAX_STRIKES.
  const lo = spot * (1 - STRIKE_WINDOW_PCT);
  const hi = spot * (1 + STRIKE_WINDOW_PCT);
  const strikeSet = Array.from(
    new Set(live.filter((c) => c.strike >= lo && c.strike <= hi).map((c) => c.strike)),
  )
    .sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot))
    .slice(0, MAX_STRIKES)
    .sort((a, b) => b - a); // render highest strike first
  const strikeIdx = new Map(strikeSet.map((s, i) => [s, i]));

  const rows: GexStrikeRow[] = strikeSet.map((strike) => ({
    strike,
    byExpiry: new Array(expiries.length).fill(0),
    net: 0,
    callGex: 0,
    putGex: 0,
  }));

  const exposureOf = (c: ChainContract): number => {
    const raw =
      metric === "gex"
        ? (c.gamma ?? 0) * c.openInterest * 100 * spot * spot * 0.01
        : (c.vega ?? 0) * c.openInterest * 100;
    return c.type === "CALL" ? raw : -raw;
  };

  for (const c of live) {
    const si = strikeIdx.get(c.strike);
    const ei = expiryIdx.get(c.expiry);
    if (si == null || ei == null) continue;
    const exp = exposureOf(c);
    const row = rows[si];
    row.byExpiry[ei] += exp;
    row.net += exp;
    if (c.type === "CALL") row.callGex += exp;
    else row.putGex += exp;
  }

  const netTotal = rows.reduce((s, r) => s + r.net, 0);

  // Zero-gamma: cumulative net from the lowest strike up; interpolate the flip.
  let zeroGamma: number | null = null;
  const asc = [...rows].sort((a, b) => a.strike - b.strike);
  let cum = 0;
  let prevCum = 0;
  let prevStrike: number | null = null;
  for (const r of asc) {
    prevCum = cum;
    cum += r.net;
    if (prevStrike != null && prevCum !== 0 && Math.sign(prevCum) !== Math.sign(cum) && cum !== 0) {
      const t = Math.abs(prevCum) / (Math.abs(prevCum) + Math.abs(cum));
      zeroGamma = prevStrike + (r.strike - prevStrike) * t;
      break;
    }
    prevStrike = r.strike;
  }

  // Max pain on the front expiry: strike minimizing total intrinsic payout.
  const frontExpiry = expiries[0] ?? null;
  let maxPain: number | null = null;
  if (frontExpiry) {
    const front = live.filter((c) => c.expiry === frontExpiry);
    const candidates = Array.from(new Set(front.map((c) => c.strike))).sort((a, b) => a - b);
    let best = Infinity;
    for (const s of candidates) {
      let payout = 0;
      for (const c of front) {
        if (c.type === "CALL" && s > c.strike) payout += (s - c.strike) * c.openInterest;
        else if (c.type === "PUT" && s < c.strike) payout += (c.strike - s) * c.openInterest;
      }
      if (payout < best) {
        best = payout;
        maxPain = s;
      }
    }
  }

  return {
    symbol: chain.symbol,
    spot,
    metric,
    expiries,
    strikes: rows,
    netTotal,
    zeroGamma,
    maxPain,
    frontExpiry,
    asOf: chain.fetchedAt,
  };
}

const MIN_VOLUME = 250;
const MIN_VOL_OI_RATIO = 2;
const MAX_ROWS_PER_SYMBOL = 15;

/**
 * Classic unusual-activity screen: contracts trading far above their open
 * interest today (volume ≥ MIN_VOLUME and vol/OI ≥ MIN_VOL_OI_RATIO),
 * ranked by estimated premium spent. High vol relative to OI implies new
 * positioning rather than closing flow.
 */
export function computeUnusualActivity(chain: OptionsChain): UnusualRow[] {
  const today = new Date().toISOString().slice(0, 10);
  const rows: UnusualRow[] = [];

  for (const c of chain.contracts) {
    if (c.expiry < today) continue;
    if (c.volume < MIN_VOLUME) continue;
    const ratio = c.volume / Math.max(c.openInterest, 1);
    if (ratio < MIN_VOL_OI_RATIO) continue;

    const mid = c.bid > 0 && c.ask > 0 ? (c.bid + c.ask) / 2 : c.last;
    if (mid <= 0) continue;

    rows.push({
      symbol: chain.symbol,
      type: c.type,
      strike: c.strike,
      expiry: c.expiry,
      spot: chain.spot,
      otmPct: ((c.strike - chain.spot) / chain.spot) * 100,
      volume: c.volume,
      openInterest: c.openInterest,
      volOiRatio: ratio,
      estPremium: c.volume * mid * 100,
      iv: c.iv,
    });
  }

  return rows
    .sort((a, b) => b.estPremium - a.estPremium)
    .slice(0, MAX_ROWS_PER_SYMBOL);
}
