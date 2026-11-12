"use client";

type Point = { n: number; bal: number };

type Props = {
  n: number[];
  p10: number[];
  p50: number[];
  p90: number[];
  start: number;
  actual?: Point[];
  log: boolean;
};

const W = 640;
const H = 270;
const L = 58;
const R = 14;
const T = 12;
const B = 44;

const MONO = "var(--font-geist-mono), ui-monospace, monospace";

const fmtAxis = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
};

function niceTicks(lo: number, hi: number, count = 4): number[] {
  const raw = (hi - lo) / count;
  if (!(raw > 0)) return [lo];
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}

function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    for (const base of [1, 2, 5]) {
      const v = base * 10 ** e;
      if (v >= lo && v <= hi) out.push(v);
    }
  }
  return out;
}

export default function EquityBand({ n, p10, p50, p90, start, actual, log }: Props) {
  const nMax = n[n.length - 1] || 1;
  const visibleActual = (actual ?? []).filter((p) => p.n <= nMax);

  const vals = [...p10, ...p90, start, ...visibleActual.map((p) => p.bal)].filter((v) => v > 0);
  let lo = Math.min(...vals) * 0.92;
  let hi = Math.max(...vals) * 1.08;
  if (!(hi > lo)) {
    lo = start * 0.9;
    hi = start * 1.1;
  }
  if (log) lo = Math.max(lo, 1);

  const x = (v: number) => L + (v / nMax) * (W - L - R);
  const y = (v: number) => {
    const t = log
      ? (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))
      : (v - lo) / (hi - lo);
    return T + (1 - t) * (H - T - B);
  };

  let yTicks = log ? logTicks(lo, hi) : niceTicks(lo, hi);
  if (yTicks.length < 2) yTicks = niceTicks(lo, hi, 4);

  const xStep = nMax <= 30 ? 5 : nMax <= 100 ? 20 : nMax <= 250 ? 50 : 100;
  const xTicks: number[] = [];
  for (let v = 0; v <= nMax; v += xStep) xTicks.push(v);

  const band =
    n.map((v, i) => `${x(v)},${y(p90[i])}`).join(" ") +
    " " +
    [...n]
      .reverse()
      .map((v, i) => `${x(v)},${y(p10[n.length - 1 - i])}`)
      .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Simulated account balance by trade number: a shaded 10th to 90th percentile band with the typical path, and your actual account if you have logged trades"
    >
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#22222e" strokeWidth={1} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fill="#6b7280" fontSize={11} fontFamily={MONO}>
            {fmtAxis(v)}
          </text>
        </g>
      ))}

      {xTicks.map((v) => (
        <text key={v} x={x(v)} y={H - 26} textAnchor="middle" fill="#6b7280" fontSize={11} fontFamily={MONO}>
          {v}
        </text>
      ))}
      <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fill="#4b5563" fontSize={10} fontFamily={MONO}>
        TRADE NUMBER
      </text>

      <line
        x1={L}
        x2={W - R}
        y1={y(start)}
        y2={y(start)}
        stroke="#6b7280"
        strokeWidth={1}
        strokeDasharray="2 4"
      />

      <polygon points={band} fill="rgba(129,140,248,0.16)" stroke="none" />
      <polyline
        points={n.map((v, i) => `${x(v)},${y(p50[i])}`).join(" ")}
        fill="none"
        stroke="#818cf8"
        strokeWidth={2}
        strokeDasharray="5 4"
      />

      {visibleActual.length > 1 && (
        <>
          <polyline
            points={visibleActual.map((p) => `${x(p.n)},${y(p.bal)}`).join(" ")}
            fill="none"
            stroke="#34d399"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <rect
            x={x(visibleActual[visibleActual.length - 1].n) - 3.5}
            y={y(visibleActual[visibleActual.length - 1].bal) - 3.5}
            width={7}
            height={7}
            fill="#34d399"
          />
        </>
      )}
    </svg>
  );
}
