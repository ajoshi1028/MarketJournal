"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getMonthDays(year: number, month: number) {
  return {
    firstDay: new Date(year, month, 1).getDay(),
    daysInMonth: new Date(year, month + 1, 0).getDate(),
  };
}

export default function CoachingPage() {
  const [coaching, setCoaching] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportDates, setReportDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/coaching", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setReportDates(new Set(data.map((r: { date: string }) => r.date.slice(0, 10))));
      }
    } catch {}
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  async function handleGenerate() {
    setLoading(true);
    setCoaching(null);
    setSelectedDate(null);
    try {
      const res = await fetch("/api/ai/coaching", { method: "POST" });
      const data = await res.json();
      if (data.coaching) {
        setCoaching(data.coaching);
        if (data.date) setSelectedDate(data.date.slice(0, 10));
        fetchHistory();
      }
    } catch {
      setCoaching("Failed to generate coaching.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/coaching?date=${dateStr}`, { cache: "no-store" });
      const data = await res.json();
      setCoaching(data?.content ?? null);
    } catch {
      setCoaching("Failed to load report.");
    } finally {
      setLoading(false);
    }
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

  function formatCoaching(text: string) {
    const sections = text.split(/(?=(?:STRENGTHS|WEAKNESSES|ACTION ITEMS|RISK MANAGEMENT|NEXT WEEK FOCUS))/);
    return sections.map((section, i) => {
      const match = section.match(/^(STRENGTHS|WEAKNESSES|ACTION ITEMS|RISK MANAGEMENT|NEXT WEEK FOCUS)/);
      if (match) {
        const header = match[1];
        const body = section.slice(header.length).trim();
        const color = header === "STRENGTHS" ? "text-profit"
          : header === "WEAKNESSES" ? "text-loss"
          : header === "ACTION ITEMS" ? "text-accent-light"
          : header === "RISK MANAGEMENT" ? "text-amber-400"
          : "text-cyan-400";
        return (
          <div key={i} className="mb-5">
            <h3 className={`text-sm font-bold ${color} mb-2`}>{header}</h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{body}</p>
          </div>
        );
      }
      return <p key={i} className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">{section.trim()}</p>;
    });
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">AI Trade Coach</h1>
        <p className="text-gray-500 text-sm">Get personalized coaching based on your trading patterns.</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Calendar sidebar */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="btn-ghost text-xs px-2">&larr;</button>
              <span className="text-sm font-semibold text-white">{monthName}</span>
              <button onClick={nextMonth} className="btn-ghost text-xs px-2">&rarr;</button>
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
                const hasReport = reportDates.has(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === toDateStr(new Date());
                return (
                  <button
                    key={day}
                    onClick={() => hasReport && handleSelectDate(dateStr)}
                    disabled={!hasReport}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-colors relative ${
                      isSelected ? "bg-accent text-white font-bold"
                        : hasReport ? "bg-accent/15 text-accent-light font-medium hover:bg-accent/25 cursor-pointer"
                        : isToday ? "text-white bg-surface-300"
                        : "text-gray-600"
                    } ${!hasReport ? "cursor-default" : ""}`}
                  >
                    {day}
                    {hasReport && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-light" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? "Analyzing..." : "Generate Today's Coaching"}
          </button>

          {reportDates.size > 0 && (
            <p className="text-xs text-gray-600 text-center">
              {reportDates.size} report{reportDates.size === 1 ? "" : "s"} saved
            </p>
          )}
        </div>

        {/* Report display */}
        <div>
          {loading && !coaching ? (
            <div className="card p-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-gray-400 text-sm">Analyzing your trading patterns...</p>
            </div>
          ) : coaching ? (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Coaching Report</h2>
                  {selectedDate && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
                <button onClick={handleGenerate} disabled={loading} className="btn-ghost text-xs disabled:opacity-50">
                  {loading ? "..." : "Refresh"}
                </button>
              </div>
              <div>{formatCoaching(coaching)}</div>
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-500">
              <p className="text-sm mb-1">No coaching report selected</p>
              <p className="text-xs text-gray-600">Click a highlighted date to view a past report, or generate today&apos;s coaching.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
