"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PLAN_DEFAULTS, type PlanSettings, type PlanStatus } from "@/lib/plan";
import { runSimulation } from "@/lib/plan-sim";
import EquityBand from "./EquityBand";

/* ---------- formatting ---------- */

const usd = (n: number, d = 0) =>
  (n < 0 ? "-$" : "$") +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const usdS = (n: number) => (n > 0 ? "+" : "") + usd(n);
const pct = (n: number, d = 0) => `${n.toFixed(d)}%`;
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

const localToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

/* ---------- plan form ---------- */

type FormState = Record<keyof PlanSettings, string>;

const planToForm = (p: PlanSettings): FormState => ({
  startingBalance: String(p.startingBalance),
  startDate: p.startDate,
  riskPct: String(p.riskPct),
  takeProfitPct: String(p.takeProfitPct),
  stopLossPct: String(p.stopLossPct),
  targetWinRate: String(p.targetWinRate),
  maxTradesPerDay: p.maxTradesPerDay == null ? "" : String(p.maxTradesPerDay),
  killWindow: String(p.killWindow),
  killFloor: String(p.killFloor),
  killRiskPct: String(p.killRiskPct),
});

const defaultForm = (): FormState =>
  planToForm({ ...PLAN_DEFAULTS, startDate: localToday() });

type SimState = {
  start: string;
  risk: string;
  win: string;
  avgWin: string;
  avgLoss: string;
  trades: string;
};

const simFromPlan = (p: PlanSettings): SimState => ({
  start: String(p.startingBalance),
  risk: String(p.riskPct),
  win: String(p.targetWinRate),
  avgWin: String(p.takeProfitPct),
  avgLoss: String(p.stopLossPct),
  trades: "100",
});

const defaultSim = (): SimState => ({
  start: String(PLAN_DEFAULTS.startingBalance),
  risk: String(PLAN_DEFAULTS.riskPct),
  win: String(PLAN_DEFAULTS.targetWinRate),
  avgWin: String(PLAN_DEFAULTS.takeProfitPct),
  avgLoss: String(PLAN_DEFAULTS.stopLossPct),
  trades: "100",
});

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={type === "date" ? undefined : "decimal"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field font-mono"
      />
    </div>
  );
}

function SectionHead({ no, title }: { no: string; title: string }) {
  return (
    <div className="mb-3 mt-10 flex items-center gap-3">
      <span className="kicker">
        {no} · {title}
      </span>
      <span className="h-px flex-1 bg-surface-300" />
    </div>
  );
}

function StatGrid({
  items,
}: {
  items: { label: string; value: string; sub?: string; color?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-surface-300 divide-x divide-y lg:divide-y-0 divide-surface-300">
      {items.map((s) => (
        <div key={s.label} className="px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
            {s.label}
          </p>
          <p className={`text-xl font-mono font-bold ${s.color ?? "text-white"}`}>{s.value}</p>
          {s.sub && <p className="font-mono text-[10px] text-gray-600 mt-1">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanSettings | null>(null);
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [entryPrice, setEntryPrice] = useState("");

  const [sim, setSim] = useState<SimState>(defaultSim);
  const [seed, setSeed] = useState(1);
  const [logScale, setLogScale] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/plan", { cache: "no-store" });
        if (res.status === 401) {
          setSignedOut(true);
          return;
        }
        if (!res.ok) {
          setLoadError("Could not load your plan.");
          return;
        }
        const data = await res.json();
        if (data.plan) {
          setPlan(data.plan);
          setStatus(data.status);
          setForm(planToForm(data.plan));
          setSim(simFromPlan(data.plan));
        }
      } catch {
        setLoadError("Network error loading your plan.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        startingBalance: num(form.startingBalance),
        startDate: form.startDate,
        riskPct: num(form.riskPct),
        takeProfitPct: num(form.takeProfitPct),
        stopLossPct: num(form.stopLossPct),
        targetWinRate: num(form.targetWinRate),
        maxTradesPerDay: form.maxTradesPerDay.trim() === "" ? null : num(form.maxTradesPerDay),
        killWindow: num(form.killWindow),
        killFloor: num(form.killFloor),
        killRiskPct: num(form.killRiskPct),
      };
      const res = await fetch("/api/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg({ ok: false, text: data.error || "Could not save the plan." });
        return;
      }
      const firstSave = !plan;
      setPlan(data.plan);
      setStatus(data.status);
      setForm(planToForm(data.plan));
      if (firstSave) setSim(simFromPlan(data.plan));
      setSaveMsg({ ok: true, text: "Plan saved." });
    } catch {
      setSaveMsg({ ok: false, text: "Network error. Try again." });
    } finally {
      setSaving(false);
    }
  }

  /* ---- next-trade sizing ---- */
  const price = num(entryPrice);
  const ticket = useMemo(() => {
    if (!plan || !status || !(price > 0)) return null;
    const perContract = price * 100;
    const contracts = Math.floor(status.maxPosition / perContract);
    return {
      perContract,
      contracts,
      cost: contracts * perContract,
      tp: price * (1 + plan.takeProfitPct / 100),
      sl: price * (1 - plan.stopLossPct / 100),
    };
  }, [plan, status, price]);

  /* ---- simulator ---- */
  const simParams = useMemo(() => {
    const v = {
      startBalance: num(sim.start),
      riskPct: num(sim.risk),
      winRate: num(sim.win),
      avgWinPct: num(sim.avgWin),
      avgLossPct: num(sim.avgLoss),
      trades: num(sim.trades),
    };
    if (Object.values(v).some((x) => !Number.isFinite(x))) return null;
    if (v.startBalance <= 0 || v.riskPct <= 0 || v.riskPct > 100) return null;
    if (v.winRate < 0 || v.winRate > 100 || v.avgWinPct < 0) return null;
    if (v.avgLossPct < 0 || v.avgLossPct > 100 || v.trades < 1 || v.trades > 500) return null;
    return v;
  }, [sim]);

  const result = useMemo(
    () => (simParams ? runSimulation({ ...simParams, runs: 2000, seed }) : null),
    [simParams, seed],
  );

  const showActual =
    !!plan && !!status && !!simParams && Math.abs(simParams.startBalance - plan.startingBalance) < 1;

  const setSimField = (k: keyof SimState) => (v: string) => setSim((s) => ({ ...s, [k]: v }));

  const insight = (() => {
    if (!result || !simParams) return null;
    const { expectancyPct, typicalGrowthPct, breakevenWinRate } = result.stats;
    const be = breakevenWinRate == null ? "" : ` You need to win at least ${pct(breakevenWinRate, 0)} of trades to break even.`;
    if (expectancyPct <= 0)
      return `At these numbers the average trade loses ${pct(Math.abs(expectancyPct), 2)} of the account.${be}`;
    if (typicalGrowthPct <= 0)
      return `The average trade gains ${pct(expectancyPct, 2)}, but swings drag compounding down, so the typical path still shrinks. Smaller positions would help.${be}`;
    return `The average trade gains ${pct(expectancyPct, 2)} of the account, and the typical path compounds at ${pct(typicalGrowthPct, 2)} per trade.${be}`;
  })();

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-2 border-b border-surface-300 pb-6">
        <p className="kicker mb-3">Plan</p>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white">Trading Plan</h1>
        <p className="font-mono text-xs text-gray-500 mt-3">
          Set your rules, log trades against them, and simulate where the plan leads.
        </p>
      </div>

      {loadError && (
        <div className="mt-6 border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm">
          {loadError}
        </div>
      )}

      {/* 01 · Plan rules */}
      <SectionHead no="01" title="Plan rules" />
      {signedOut ? (
        <div className="card p-6 text-sm text-gray-400">
          <Link href="/sign-in" className="text-accent-light hover:underline">
            Sign in
          </Link>{" "}
          to save a plan and measure your trades against it. The simulator below works without an account.
        </div>
      ) : (
        <form onSubmit={savePlan} className="card">
          <div className="panel-head">
            <span>Rules</span>
            <span>{loading ? "loading" : plan ? "saved" : "not set yet"}</span>
          </div>
          <div className="p-4">
            {!plan && !loading && (
              <p className="text-sm text-gray-500 mb-4 max-w-2xl">
                Decide your rules once, while you are calm: how big the account is, how much goes into one
                position, where you take profit and cut losses. Trades you log on or after the start date are
                measured against them.
              </p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field id="p-bal" label="Starting balance ($)" value={form.startingBalance} onChange={(v) => setForm({ ...form, startingBalance: v })} />
              <Field id="p-date" label="Start date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
              <Field id="p-risk" label="Position size (% of account)" value={form.riskPct} onChange={(v) => setForm({ ...form, riskPct: v })} />
              <Field id="p-max" label="Max trades per day (optional)" value={form.maxTradesPerDay} onChange={(v) => setForm({ ...form, maxTradesPerDay: v })} placeholder="no limit" />
              <Field id="p-tp" label="Take-profit (% gain)" value={form.takeProfitPct} onChange={(v) => setForm({ ...form, takeProfitPct: v })} />
              <Field id="p-sl" label="Stop-loss (% loss)" value={form.stopLossPct} onChange={(v) => setForm({ ...form, stopLossPct: v })} />
              <Field id="p-win" label="Target win rate (%)" value={form.targetWinRate} onChange={(v) => setForm({ ...form, targetWinRate: v })} />
              <div className="hidden lg:block" />
              <Field id="p-kw" label="Kill switch: window (trades)" value={form.killWindow} onChange={(v) => setForm({ ...form, killWindow: v })} />
              <Field id="p-kf" label="Kill switch: win-rate floor (%)" value={form.killFloor} onChange={(v) => setForm({ ...form, killFloor: v })} />
              <Field id="p-kr" label="Size while switch is on (%)" value={form.killRiskPct} onChange={(v) => setForm({ ...form, killRiskPct: v })} />
            </div>
            <div className="mt-5 flex items-center gap-4">
              <button type="submit" disabled={saving || loading} className="btn-primary disabled:opacity-50">
                {saving ? "Saving..." : plan ? "Update plan" : "Save plan"}
              </button>
              {saveMsg && (
                <span className={`text-sm ${saveMsg.ok ? "text-profit" : "text-red-400"}`}>{saveMsg.text}</span>
              )}
            </div>
          </div>
        </form>
      )}

      {/* 02 · Status */}
      {plan && status && (
        <>
          <SectionHead no="02" title="Where you stand" />
          {status.killOn && (
            <div className="mb-4 border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm">
              Kill switch on: your last {plan.killWindow} trades won {pct(status.rollingWinRate ?? 0)}, below your{" "}
              {pct(plan.killFloor)} floor. Size down to {pct(plan.killRiskPct, 1)} ({usd(status.maxPosition)}) per
              position until it recovers.
            </div>
          )}
          <StatGrid
            items={[
              {
                label: "Plan balance",
                value: usd(status.balance),
                sub: `started ${usd(plan.startingBalance)}`,
              },
              {
                label: "Plan P&L",
                value: usdS(status.pnl),
                sub: `${status.closedCount} closed of ${status.tradeCount} logged`,
                color: status.pnl > 0 ? "text-profit" : status.pnl < 0 ? "text-loss" : "text-white",
              },
              {
                label: "Win rate",
                value: status.winRate == null ? "-" : pct(status.winRate),
                sub: `target ${pct(plan.targetWinRate)}`,
                color:
                  status.winRate == null || status.closedCount < 10
                    ? "text-white"
                    : status.winRate >= plan.targetWinRate
                      ? "text-profit"
                      : "text-loss",
              },
              {
                label: `Last ${plan.killWindow}`,
                value: status.rollingWinRate == null ? "-" : pct(status.rollingWinRate),
                sub: status.killOn
                  ? "kill switch on"
                  : `${status.rollingCount}/${plan.killWindow} trades · floor ${pct(plan.killFloor)}`,
                color: status.killOn ? "text-loss" : "text-white",
              },
              {
                label: "Trades today",
                value: plan.maxTradesPerDay ? `${status.tradesToday} / ${plan.maxTradesPerDay}` : String(status.tradesToday),
                sub: plan.maxTradesPerDay ? "daily cap" : "no daily cap",
                color:
                  plan.maxTradesPerDay && status.tradesToday > plan.maxTradesPerDay ? "text-loss" : "text-white",
              },
              {
                label: "Rule breaks",
                value: String(status.oversizeCount + status.overLimitDays),
                sub: `${status.oversizeCount} oversize · ${status.overLimitDays} over-cap days`,
                color: status.oversizeCount + status.overLimitDays > 0 ? "text-amber-400" : "text-profit",
              },
            ]}
          />
          {status.closedCount < 10 && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-gray-600">
              Small sample: win-rate colors switch on after 10 closed trades.
            </p>
          )}

          {/* 03 · Next trade */}
          <SectionHead no="03" title="Size your next trade" />
          <div className="card">
            <div className="panel-head">
              <span>Next position</span>
              <span>
                max {usd(status.maxPosition)} · {pct(status.effectiveRiskPct, 1)} of {usd(status.balance)}
              </span>
            </div>
            <div className="p-4 grid lg:grid-cols-[260px_1fr] gap-6 items-start">
              <Field
                id="t-price"
                label="Contract price (per share)"
                value={entryPrice}
                onChange={setEntryPrice}
                placeholder="e.g. 1.25"
              />
              {ticket ? (
                ticket.contracts < 1 ? (
                  <p className="text-sm text-amber-400 self-center">
                    One contract costs {usd(ticket.perContract)}, which is above your max position of{" "}
                    {usd(status.maxPosition)}. Pass on this one, or pick a cheaper contract.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 border border-surface-300 divide-x divide-surface-300">
                    {[
                      { l: "Contracts", v: String(ticket.contracts), s: `${usd(ticket.cost)} in` },
                      { l: "Take-profit at", v: usd(ticket.tp, 2), s: `+${pct(plan.takeProfitPct)}` },
                      { l: "Stop at", v: usd(ticket.sl, 2), s: `-${pct(plan.stopLossPct)}` },
                      {
                        l: "Risk if stopped",
                        v: usd((ticket.cost * plan.stopLossPct) / 100),
                        s: `${pct(((ticket.cost * plan.stopLossPct) / 100 / status.balance) * 100, 1)} of account`,
                      },
                    ].map((c) => (
                      <div key={c.l} className="px-4 py-3">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1">{c.l}</p>
                        <p className="text-lg font-mono font-bold text-white">{c.v}</p>
                        <p className="font-mono text-[10px] text-gray-600 mt-0.5">{c.s}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-gray-600 self-center">
                  Enter a contract price to see contracts, targets, and the dollar risk.
                </p>
              )}
            </div>
          </div>

          {/* 04 · Adherence */}
          <SectionHead no="04" title="Did you follow it" />
          <div className="card">
            <div className="panel-head">
              <span>Recent trades vs position limit</span>
              <Link href="/trades" className="text-accent-light hover:text-accent transition-colors normal-case tracking-normal">
                log a trade →
              </Link>
            </div>
            {status.recent.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                No trades on or after {plan.startDate} yet. Log trades in Trades and they will show up here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-surface-300 text-[10px] uppercase tracking-wider text-gray-500">
                      <th className="text-left px-4 py-2.5 font-medium">Date</th>
                      <th className="text-left px-3 py-2.5 font-medium">Ticker</th>
                      <th className="text-right px-3 py-2.5 font-medium">Position</th>
                      <th className="text-right px-3 py-2.5 font-medium">Limit</th>
                      <th className="text-right px-3 py-2.5 font-medium">P&amp;L</th>
                      <th className="text-right px-4 py-2.5 font-medium">Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-300">
                    {status.recent.map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-2.5 text-gray-400">{t.date}</td>
                        <td className="px-3 py-2.5 text-white font-bold">{t.ticker}</td>
                        <td className="px-3 py-2.5 text-right text-gray-200">{usd(t.cost)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{usd(t.limit)}</td>
                        <td
                          className={`px-3 py-2.5 text-right ${
                            t.pnl == null ? "text-gray-600" : t.pnl >= 0 ? "text-profit" : "text-loss"
                          }`}
                        >
                          {t.pnl == null ? "open" : usdS(t.pnl)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-bold ${t.oversize ? "text-amber-400" : "text-profit"}`}>
                          {t.oversize ? "OVERSIZE" : "OK"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 py-2.5 border-t border-surface-300 font-mono text-[10px] uppercase tracking-wider text-gray-600">
              Position = contracts x price x 100. Limit = size % of the balance before the trade. 10% tolerance for whole contracts.
            </div>
          </div>
        </>
      )}

      {/* 05 · Simulator */}
      <SectionHead no={plan ? "05" : "02"} title="Simulator" />
      <div className="card">
        <div className="panel-head">
          <span>2,000 simulated accounts</span>
          <span>same numbers, different luck</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <Field id="s-start" label="Start balance ($)" value={sim.start} onChange={setSimField("start")} />
            <Field id="s-risk" label="Position size (%)" value={sim.risk} onChange={setSimField("risk")} />
            <Field id="s-win" label="Win rate (%)" value={sim.win} onChange={setSimField("win")} />
            <Field id="s-aw" label="Avg win (% of position)" value={sim.avgWin} onChange={setSimField("avgWin")} />
            <Field id="s-al" label="Avg loss (% of position)" value={sim.avgLoss} onChange={setSimField("avgLoss")} />
            <Field id="s-n" label="Trades (max 500)" value={sim.trades} onChange={setSimField("trades")} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs">
            {plan && (
              <button type="button" className="btn-ghost border border-surface-400" onClick={() => setSim(simFromPlan(plan))}>
                Use my plan
              </button>
            )}
            {status && status.closedCount > 0 && status.avgWinPct != null && status.avgLossPct != null && (
              <button
                type="button"
                className="btn-ghost border border-surface-400"
                onClick={() =>
                  setSim((s) => ({
                    ...s,
                    win: String(Math.round((status.winRate ?? 0) * 10) / 10),
                    avgWin: String(Math.round(status.avgWinPct! * 10) / 10),
                    avgLoss: String(Math.round(status.avgLossPct! * 10) / 10),
                  }))
                }
              >
                Use my results
              </button>
            )}
            {status && (
              <button
                type="button"
                className="btn-ghost border border-surface-400"
                onClick={() => setSim((s) => ({ ...s, start: String(Math.round(status.balance)) }))}
              >
                Start from today
              </button>
            )}
            <button type="button" className="btn-ghost border border-surface-400" onClick={() => setSeed((s) => s + 1)}>
              Re-roll luck
            </button>
            <button type="button" className="btn-ghost border border-surface-400" onClick={() => setLogScale((v) => !v)}>
              {logScale ? "Log scale" : "Linear scale"}
            </button>
          </div>
        </div>

        {result && simParams ? (
          <>
            <div className="border-t border-surface-300 px-4 py-4">
              <EquityBand
                n={result.n}
                p10={result.p10}
                p50={result.p50}
                p90={result.p90}
                start={simParams.startBalance}
                actual={showActual ? status!.equity : undefined}
                log={logScale}
              />
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-accent/30 inline-block" /> middle 80% of accounts
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-accent-light inline-block" /> typical path
                </span>
                {showActual && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-profit inline-block" /> your account
                  </span>
                )}
              </div>
            </div>
            <div className="border-t border-surface-300">
              <StatGrid
                items={[
                  {
                    label: "Typical end",
                    value: usd(result.stats.medianFinal),
                    sub: `from ${usd(simParams.startBalance)}`,
                    color: result.stats.medianFinal >= simParams.startBalance ? "text-profit" : "text-loss",
                  },
                  {
                    label: "Likely range",
                    value: `${usd(result.stats.p10Final)} to ${usd(result.stats.p90Final)}`,
                    sub: "10th to 90th percentile",
                  },
                  { label: "Chance to double", value: pct(result.stats.probDouble), sub: `after ${simParams.trades} trades` },
                  {
                    label: "Chance to lose half",
                    value: pct(result.stats.probHalf),
                    color: result.stats.probHalf >= 10 ? "text-loss" : "text-white",
                  },
                  {
                    label: "Typical worst drop",
                    value: pct(result.stats.medianMaxDrawdown),
                    sub: "peak to trough, median run",
                  },
                  {
                    label: "Avg trade",
                    value: `${result.stats.expectancyPct >= 0 ? "+" : ""}${pct(result.stats.expectancyPct, 2)}`,
                    sub: "of the account",
                    color: result.stats.expectancyPct > 0 ? "text-profit" : "text-loss",
                  },
                ]}
              />
            </div>
            {insight && (
              <p className="border-t border-surface-300 px-4 py-3 text-sm text-gray-400">{insight}</p>
            )}
            {showActual && status && status.closedCount > 0 && (
              <p className="border-t border-surface-300 px-4 py-3 font-mono text-[11px] text-gray-500">
                After {status.closedCount} closed trades you are at {usd(status.balance)}.
              </p>
            )}
          </>
        ) : (
          <p className="border-t border-surface-300 p-4 text-sm text-gray-500">
            Check the inputs: balance above 0, position size 0 to 100, win rate 0 to 100, avg loss 0 to 100, and 1 to
            500 trades.
          </p>
        )}
      </div>

      <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-gray-600">
        Simulations assume every trade has the same odds and size. Real markets do not, so treat this as a stress test,
        not a forecast or financial advice.
      </p>
    </main>
  );
}
