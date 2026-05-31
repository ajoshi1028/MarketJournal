"use client";

import { useEffect, useState, useCallback } from "react";

type JournalEntry = {
  id: string;
  date: string;
  premarketPlan: string | null;
  watchlist: string[];
  marketBias: string | null;
  keyLevels: string | null;
  postReview: string | null;
  lessonsLearned: string | null;
  mood: number | null;
  confidence: number | null;
  grade: string | null;
};

const GRADES = ["A", "B", "C", "D", "F"];
const BIASES = ["bullish", "bearish", "neutral"];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMonthDays(year: number, month: number) {
  return {
    firstDay: new Date(year, month, 1).getDay(),
    daysInMonth: new Date(year, month + 1, 0).getDate(),
  };
}

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [entry, setEntry] = useState<Partial<JournalEntry>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [watchlistInput, setWatchlistInput] = useState("");
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set());

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const fetchEntry = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/journal?date=${date}`, { cache: "no-store" });
      const data = await res.json();
      if (data?.id) {
        setEntry(data);
        setWatchlistInput(data.watchlist?.join(", ") || "");
      } else {
        setEntry({});
        setWatchlistInput("");
      }
    } catch {
      setEntry({});
    }
  }, []);

  const fetchAllDates = useCallback(async () => {
    try {
      const res = await fetch("/api/journal?limit=500", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEntryDates(new Set(data.map((e: { date: string }) => e.date.slice(0, 10))));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchEntry(selectedDate);
    fetchAllDates();
  }, [selectedDate, fetchEntry, fetchAllDates]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const watchlist = watchlistInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entry, date: selectedDate, watchlist }),
      });
      setSaved(true);
      fetchAllDates();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function setField(key: string, value: unknown) {
    setEntry((prev) => ({ ...prev, [key]: value }));
  }

  const { firstDay, daysInMonth } = getMonthDays(calYear, calMonth);
  const monthName = new Date(calYear, calMonth).toLocaleString("en-US", { month: "long", year: "numeric" });

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  }

  const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Daily Journal</h1>
        <p className="text-gray-500 text-sm">
          Pre-market plan, post-market review, lessons learned.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Calendar sidebar */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="btn-ghost text-xs px-2" aria-label="Previous month">&larr;</button>
              <span className="text-sm font-semibold text-white">{monthName}</span>
              <button onClick={nextMonth} className="btn-ghost text-xs px-2" aria-label="Next month">&rarr;</button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                <div key={d} className="text-center text-xs text-gray-600 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasEntry = entryDates.has(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === toDateStr(new Date());
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-colors relative cursor-pointer ${
                      isSelected ? "bg-accent text-white font-bold"
                        : hasEntry ? "bg-accent/15 text-accent-light font-medium hover:bg-accent/25"
                        : isToday ? "text-white bg-surface-300 hover:bg-surface-400"
                        : "text-gray-600 hover:bg-surface-200"
                    }`}
                  >
                    {day}
                    {hasEntry && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-light" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {entryDates.size > 0 && (
            <p className="text-xs text-gray-600 text-center">
              {entryDates.size} journal entr{entryDates.size === 1 ? "y" : "ies"} saved
            </p>
          )}
        </div>

        {/* Main content */}
        <div className="space-y-5">
          <p className="text-gray-400 text-sm">{dateLabel}</p>

          {/* Pre-market */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-white mb-3">
              Pre-Market Game Plan
            </h2>
            <div className="space-y-4">
              <div>
                <label id="bias-label" className="label">Market Bias</label>
                <div className="flex gap-2" role="group" aria-labelledby="bias-label">
                  {BIASES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setField("marketBias", b)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                        entry.marketBias === b
                          ? b === "bullish"
                            ? "bg-profit/20 text-profit"
                            : b === "bearish"
                              ? "bg-loss/20 text-loss"
                              : "bg-amber-500/20 text-amber-400"
                          : "bg-surface-200 text-gray-400 hover:bg-surface-300"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="journal-watchlist" className="label">Watchlist (comma separated)</label>
                <input
                  id="journal-watchlist"
                  type="text"
                  value={watchlistInput}
                  onChange={(e) => setWatchlistInput(e.target.value)}
                  className="input-field"
                  placeholder="SPY, QQQ, AAPL, TSLA"
                />
              </div>

              <div>
                <label htmlFor="journal-gameplan" className="label">Game Plan</label>
                <textarea
                  id="journal-gameplan"
                  rows={4}
                  value={entry.premarketPlan || ""}
                  onChange={(e) => setField("premarketPlan", e.target.value)}
                  className="input-field resize-none"
                  placeholder="What setups am I looking for today? Key levels? Rules to follow?"
                />
              </div>

              <div>
                <label htmlFor="journal-keylevels" className="label">Key Levels / Notes</label>
                <textarea
                  id="journal-keylevels"
                  rows={3}
                  value={entry.keyLevels || ""}
                  onChange={(e) => setField("keyLevels", e.target.value)}
                  className="input-field resize-none"
                  placeholder="Support/resistance levels, earnings dates, macro events..."
                />
              </div>
            </div>
          </div>

          {/* Post-market */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-white mb-3">
              Post-Market Review
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="journal-postreview" className="label">What happened today?</label>
                <textarea
                  id="journal-postreview"
                  rows={4}
                  value={entry.postReview || ""}
                  onChange={(e) => setField("postReview", e.target.value)}
                  className="input-field resize-none"
                  placeholder="How did the day go? Did I stick to my plan?"
                />
              </div>

              <div>
                <label htmlFor="journal-lessons" className="label">Lessons Learned</label>
                <textarea
                  id="journal-lessons"
                  rows={3}
                  value={entry.lessonsLearned || ""}
                  onChange={(e) => setField("lessonsLearned", e.target.value)}
                  className="input-field resize-none"
                  placeholder="What will I do differently tomorrow?"
                />
              </div>
            </div>
          </div>

          {/* Self assessment */}
          <div className="card p-5">
            <h3 className="text-base font-semibold text-white mb-3">
              Self Assessment
            </h3>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label id="mood-label" className="label">Mood (1-5)</label>
                <div className="flex gap-1" role="group" aria-labelledby="mood-label">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setField("mood", n)}
                      aria-label={`Mood ${n}`}
                      aria-pressed={entry.mood === n}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        entry.mood === n
                          ? "bg-accent text-white"
                          : "bg-surface-200 text-gray-400 hover:bg-surface-300"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label id="confidence-label" className="label">Confidence (1-5)</label>
                <div className="flex gap-1" role="group" aria-labelledby="confidence-label">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setField("confidence", n)}
                      aria-label={`Confidence ${n}`}
                      aria-pressed={entry.confidence === n}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        entry.confidence === n
                          ? "bg-accent text-white"
                          : "bg-surface-200 text-gray-400 hover:bg-surface-300"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label id="grade-label" className="label">Day Grade</label>
                <div className="flex gap-1" role="group" aria-labelledby="grade-label">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setField("grade", g)}
                      aria-label={`Grade ${g}`}
                      aria-pressed={entry.grade === g}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                        entry.grade === g
                          ? g <= "B"
                            ? "bg-profit/20 text-profit"
                            : g === "C"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-loss/20 text-loss"
                          : "bg-surface-200 text-gray-400 hover:bg-surface-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Journal Entry"}
          </button>
        </div>
      </div>
    </main>
  );
}
