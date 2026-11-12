/**
 * Monte Carlo account simulator for a fixed trading plan.
 *
 * Each trade puts `riskPct` of the current balance into one position. A win
 * returns `avgWinPct` of that position, a loss costs `avgLossPct` of it, so
 * the balance multiplies by (1 + f·w) or (1 − f·l). Pure and seeded: the same
 * inputs always yield the same paths, so UI sliders don't make the chart jitter.
 */

export const SIM_LIMITS = { maxTrades: 500, maxRuns: 3000, maxCheckpoints: 125 };

export type SimParams = {
  startBalance: number;
  riskPct: number; // % of balance in each position
  winRate: number; // %
  avgWinPct: number; // % gain on a winning position
  avgLossPct: number; // % loss on a losing position (positive number)
  trades: number;
  runs: number;
  seed: number;
};

export type SimResult = {
  n: number[]; // trade numbers at each checkpoint
  p10: number[];
  p50: number[];
  p90: number[];
  stats: {
    medianFinal: number;
    p10Final: number;
    p90Final: number;
    probDouble: number; // % of runs ending ≥ 2× start
    probHalf: number; // % of runs ending ≤ ½ start
    medianMaxDrawdown: number; // %
    /** Average account change per trade, % of balance. */
    expectancyPct: number;
    /** Win rate at which expectancy is zero, %. */
    breakevenWinRate: number | null;
    /** Compounded growth per trade of the typical path, % (negative = decays). */
    typicalGrowthPct: number;
  };
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function quantile(sorted: Float64Array, q: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function runSimulation(input: SimParams): SimResult {
  const trades = Math.round(clamp(input.trades, 1, SIM_LIMITS.maxTrades));
  const runs = Math.round(clamp(input.runs, 100, SIM_LIMITS.maxRuns));
  const start = Math.max(1, input.startBalance);
  const f = clamp(input.riskPct, 0, 100) / 100;
  const p = clamp(input.winRate, 0, 100) / 100;
  const w = Math.max(0, input.avgWinPct) / 100;
  const l = clamp(input.avgLossPct, 0, 100) / 100;

  const winMult = 1 + f * w;
  const lossMult = Math.max(0, 1 - f * l);
  const rand = mulberry32(input.seed);

  // Checkpoints: trade 0 plus an evenly spaced subset ending at `trades`.
  const stride = Math.max(1, Math.ceil(trades / SIM_LIMITS.maxCheckpoints));
  const checkpoints: number[] = [0];
  for (let i = stride; i < trades; i += stride) checkpoints.push(i);
  checkpoints.push(trades);
  const cpIndex = new Map(checkpoints.map((n, i) => [n, i]));
  const cols = checkpoints.length;

  const grid = new Float64Array(runs * cols);
  const drawdowns = new Float64Array(runs);

  for (let r = 0; r < runs; r++) {
    let bal = start;
    let peak = start;
    let maxDd = 0;
    grid[r * cols] = start;
    for (let i = 1; i <= trades; i++) {
      bal *= rand() < p ? winMult : lossMult;
      if (bal > peak) peak = bal;
      else {
        const dd = 1 - bal / peak;
        if (dd > maxDd) maxDd = dd;
      }
      const ci = cpIndex.get(i);
      if (ci !== undefined) grid[r * cols + ci] = bal;
    }
    drawdowns[r] = maxDd;
  }

  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];
  const column = new Float64Array(runs);
  let finals = new Float64Array(runs);

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < runs; r++) column[r] = grid[r * cols + c];
    const sorted = column.slice().sort();
    p10.push(quantile(sorted, 0.1));
    p50.push(quantile(sorted, 0.5));
    p90.push(quantile(sorted, 0.9));
    if (c === cols - 1) finals = sorted;
  }

  let doubled = 0;
  let halved = 0;
  for (let r = 0; r < runs; r++) {
    if (finals[r] >= start * 2) doubled++;
    if (finals[r] <= start * 0.5) halved++;
  }

  const expectancy = p * f * w - (1 - p) * f * l;
  const geo =
    lossMult === 0 && p < 1
      ? -1
      : Math.exp(p * Math.log(winMult) + (1 - p) * Math.log(lossMult || 1)) - 1;

  return {
    n: checkpoints,
    p10,
    p50,
    p90,
    stats: {
      medianFinal: quantile(finals, 0.5),
      p10Final: quantile(finals, 0.1),
      p90Final: quantile(finals, 0.9),
      probDouble: (doubled / runs) * 100,
      probHalf: (halved / runs) * 100,
      medianMaxDrawdown: quantile(drawdowns.slice().sort(), 0.5) * 100,
      expectancyPct: expectancy * 100,
      breakevenWinRate: w + l > 0 ? (l / (w + l)) * 100 : null,
      typicalGrowthPct: geo * 100,
    },
  };
}
