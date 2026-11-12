/**
 * Trading-plan rules: validation of user input and measurement of logged
 * trades against the plan. Pure functions — no I/O — so the API route stays
 * thin and the math is checkable in isolation.
 */

import { CONTRACT_MULTIPLIER } from "@/lib/trade-math";

export type PlanSettings = {
  startingBalance: number;
  startDate: string; // YYYY-MM-DD
  riskPct: number;
  takeProfitPct: number;
  stopLossPct: number;
  targetWinRate: number;
  maxTradesPerDay: number | null;
  killWindow: number;
  killFloor: number;
  killRiskPct: number;
};

export const PLAN_DEFAULTS: Omit<PlanSettings, "startDate"> = {
  startingBalance: 5000,
  riskPct: 10,
  takeProfitPct: 30,
  stopLossPct: 25,
  targetWinRate: 55,
  maxTradesPerDay: null,
  killWindow: 20,
  killFloor: 45,
  killRiskPct: 1,
};

type Bounds = { min: number; max: number; int?: boolean };

const BOUNDS: Record<Exclude<keyof PlanSettings, "startDate" | "maxTradesPerDay">, Bounds> & {
  maxTradesPerDay: Bounds;
} = {
  startingBalance: { min: 100, max: 1_000_000_000 },
  riskPct: { min: 0.1, max: 100 },
  takeProfitPct: { min: 1, max: 1000 },
  stopLossPct: { min: 1, max: 100 },
  targetWinRate: { min: 1, max: 99 },
  maxTradesPerDay: { min: 1, max: 50, int: true },
  killWindow: { min: 5, max: 200, int: true },
  killFloor: { min: 1, max: 99 },
  killRiskPct: { min: 0.1, max: 100 },
};

const LABELS: Record<string, string> = {
  startingBalance: "Starting balance",
  riskPct: "Position size",
  takeProfitPct: "Take-profit",
  stopLossPct: "Stop-loss",
  targetWinRate: "Target win rate",
  maxTradesPerDay: "Max trades per day",
  killWindow: "Kill-switch window",
  killFloor: "Kill-switch floor",
  killRiskPct: "Reduced position size",
};

export function parsePlanInput(
  raw: unknown,
): { ok: true; value: PlanSettings } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object")
    return { ok: false, error: "Invalid payload" };
  const body = raw as Record<string, unknown>;

  const startDate = String(body.startDate ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || isNaN(new Date(startDate + "T00:00:00.000Z").getTime()))
    return { ok: false, error: "Start date must be a valid date" };

  const out: Record<string, number | null> = {};
  for (const key of Object.keys(BOUNDS) as (keyof typeof BOUNDS)[]) {
    const b = BOUNDS[key];
    const v = body[key];

    if (key === "maxTradesPerDay" && (v === null || v === undefined || v === "")) {
      out[key] = null;
      continue;
    }

    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n))
      return { ok: false, error: `${LABELS[key]} must be a number` };
    if (b.int && !Number.isInteger(n))
      return { ok: false, error: `${LABELS[key]} must be a whole number` };
    if (n < b.min || n > b.max)
      return { ok: false, error: `${LABELS[key]} must be between ${b.min} and ${b.max}` };
    out[key] = n;
  }

  if ((out.killRiskPct as number) > (out.riskPct as number))
    return { ok: false, error: "Reduced position size can't exceed the normal position size" };

  return {
    ok: true,
    value: { ...(out as Omit<PlanSettings, "startDate">), startDate },
  };
}

/* ---------- measuring trades against the plan ---------- */

export type PlanTrade = {
  id: string;
  ticker: string;
  entryDate: Date;
  createdAt: Date;
  totalBuyQty: number | null;
  avgBuyPrice: number | null;
  realizedPnl: number | null;
  outcome: "PROFIT" | "LOSS" | null;
};

export type PlanStatus = {
  balance: number;
  pnl: number;
  tradeCount: number;
  closedCount: number;
  winRate: number | null; // %
  rollingWinRate: number | null; // % over the last killWindow closed trades
  rollingCount: number;
  killOn: boolean;
  /** Mean gain of winning trades as % of the position cost. */
  avgWinPct: number | null;
  /** Mean loss of losing trades as a positive % of the position cost. */
  avgLossPct: number | null;
  effectiveRiskPct: number;
  maxPosition: number; // dollars allowed in the next position
  tradesToday: number;
  oversizeCount: number;
  overLimitDays: number;
  equity: { n: number; bal: number }[];
  recent: {
    id: string;
    ticker: string;
    date: string;
    cost: number;
    limit: number;
    pnl: number | null;
    oversize: boolean;
  }[];
};

/** Contract granularity makes exact sizing impossible; allow 10% over the limit. */
const OVERSIZE_TOLERANCE = 1.1;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function computePlanStatus(
  plan: PlanSettings,
  trades: PlanTrade[],
  now: Date = new Date(),
): PlanStatus {
  const ordered = [...trades].sort(
    (a, b) =>
      a.entryDate.getTime() - b.entryDate.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );

  let bal = plan.startingBalance;
  let pnl = 0;
  let oversizeCount = 0;
  const equity = [{ n: 0, bal }];
  const closed: PlanTrade[] = [];
  const perDay = new Map<string, number>();
  const sized: PlanStatus["recent"] = [];
  const winPcts: number[] = [];
  const lossPcts: number[] = [];

  for (const t of ordered) {
    const cost = (t.totalBuyQty ?? 0) * (t.avgBuyPrice ?? 0) * CONTRACT_MULTIPLIER;
    const limit = (bal * plan.riskPct) / 100;
    const oversize = cost > limit * OVERSIZE_TOLERANCE;
    if (oversize) oversizeCount++;

    const day = dayKey(t.entryDate);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);

    sized.push({
      id: t.id,
      ticker: t.ticker,
      date: day,
      cost,
      limit,
      pnl: t.realizedPnl,
      oversize,
    });

    if (t.outcome === "PROFIT" || t.outcome === "LOSS") {
      const p = t.realizedPnl ?? 0;
      bal += p;
      pnl += p;
      closed.push(t);
      equity.push({ n: closed.length, bal });
      if (cost > 0) {
        if (t.outcome === "PROFIT") winPcts.push((p / cost) * 100);
        else lossPcts.push((Math.abs(p) / cost) * 100);
      }
    }
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const wins = closed.filter((t) => t.outcome === "PROFIT").length;

  const window = closed.slice(-plan.killWindow);
  const rollingWinRate = window.length
    ? (window.filter((t) => t.outcome === "PROFIT").length / window.length) * 100
    : null;
  const killOn =
    window.length >= plan.killWindow &&
    rollingWinRate !== null &&
    rollingWinRate < plan.killFloor;

  const effectiveRiskPct = killOn ? plan.killRiskPct : plan.riskPct;

  const overLimitDays =
    plan.maxTradesPerDay == null
      ? 0
      : [...perDay.values()].filter((c) => c > plan.maxTradesPerDay!).length;

  return {
    balance: bal,
    pnl,
    tradeCount: ordered.length,
    closedCount: closed.length,
    winRate: closed.length ? (wins / closed.length) * 100 : null,
    rollingWinRate,
    rollingCount: window.length,
    killOn,
    avgWinPct: mean(winPcts),
    avgLossPct: mean(lossPcts),
    effectiveRiskPct,
    maxPosition: (bal * effectiveRiskPct) / 100,
    tradesToday: perDay.get(dayKey(now)) ?? 0,
    oversizeCount,
    overLimitDays,
    equity,
    recent: sized.slice(-10).reverse(),
  };
}
