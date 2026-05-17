"use client";

export const dynamic = "force-dynamic";

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

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [entry, setEntry] = useState<Partial<JournalEntry>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [watchlistInput, setWatchlistInput] = useState("");
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);

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

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/journal?limit=10", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setRecentEntries(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchEntry(selectedDate);
    fetchRecent();
  }, [selectedDate, fetchEntry, fetchRecent]);

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
      fetchRecent();
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

  function prevDay() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateStr(d));
  }
  function nextDay() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setSelectedDate(toDateStr(d));
  }

  const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Daily Journal</h1>
          <p className="text-gray-500 text-sm">
            Pre-market plan, post-market review, lessons learned.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="btn-ghost text-sm">
            &larr;
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field w-auto text-sm"
          />
          <button onClick={nextDay} className="btn-ghost text-sm">
            &rarr;
          </button>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-6">{dateLabel}</p>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Pre-market */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-white mb-3">
              Pre-Market Game Plan
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Market Bias</label>
                <div className="flex gap-2">
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
                <label className="label">Watchlist (comma separated)</label>
                <input
                  type="text"
                  value={watchlistInput}
                  onChange={(e) => setWatchlistInput(e.target.value)}
                  className="input-field"
                  placeholder="SPY, QQQ, AAPL, TSLA"
                />
              </div>

              <div>
                <label className="label">Game Plan</label>
                <textarea
                  rows={4}
                  value={entry.premarketPlan || ""}
                  onChange={(e) => setField("premarketPlan", e.target.value)}
                  className="input-field resize-none"
                  placeholder="What setups am I looking for today? Key levels? Rules to follow?"
                />
              </div>

              <div>
                <label className="label">Key Levels / Notes</label>
                <textarea
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
                <label className="label">What happened today?</label>
                <textarea
                  rows={4}
                  value={entry.postReview || ""}
                  onChange={(e) => setField("postReview", e.target.value)}
                  className="input-field resize-none"
                  placeholder="How did the day go? Did I stick to my plan?"
                />
              </div>

              <div>
                <label className="label">Lessons Learned</label>
                <textarea
                  rows={3}
                  value={entry.lessonsLearned || ""}
                  onChange={(e) => setField("lessonsLearned", e.target.value)}
                  className="input-field resize-none"
                  placeholder="What will I do differently tomorrow?"
                />
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

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Self-assessment */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              Self Assessment
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Mood (1-5)</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setField("mood", n)}
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
                <label className="label">Confidence (1-5)</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setField("confidence", n)}
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
                <label className="label">Day Grade</label>
                <div className="flex gap-1">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setField("grade", g)}
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

          {/* Recent entries */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              Recent Entries
            </h3>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {recentEntries.length === 0 ? (
                <p className="text-xs text-gray-600">No entries yet.</p>
              ) : (
                recentEntries.map((e) => {
                  const dateStr = e.date.slice(0, 10);
                  const d = new Date(dateStr + "T12:00:00");
                  const isSelected = dateStr === selectedDate;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-accent/15 text-accent-light"
                          : "text-gray-400 hover:bg-surface-200"
                      }`}
                    >
                      <span className="font-medium">
                        {d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {e.grade && (
                        <span className="ml-2 text-xs text-gray-500">
                          Grade: {e.grade}
                        </span>
                      )}
                      {e.marketBias && (
                        <span className="ml-2 text-xs text-gray-600 capitalize">
                          {e.marketBias}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
