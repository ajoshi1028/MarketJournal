"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";

export default function CoachingPage() {
  const [coaching, setCoaching] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchCoaching() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/coaching", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Error ${res.status}`);
        return;
      }
      const data = await res.json();
      setCoaching(data.coaching);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          AI Trade Coach
        </h1>
        <p className="text-gray-500 text-sm">
          Get personalized coaching based on your trading patterns, strengths,
          and weaknesses.
        </p>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Personalized Analysis
            </h2>
            <p className="text-sm text-gray-500">
              AI analyzes your last 200 trades for patterns
            </p>
          </div>
          <button
            onClick={fetchCoaching}
            disabled={loading}
            className="btn-primary text-sm disabled:opacity-50 shrink-0"
          >
            {loading ? "Analyzing..." : coaching ? "Refresh Analysis" : "Get Coaching"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 py-8">
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>
              Analyzing your trading patterns... This may take a moment.
            </span>
          </div>
        )}

        {coaching && !loading && (
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-300 leading-relaxed text-sm">
              {coaching.split(/\n(?=\d\.|#{1,3} )/).map((section, i) => {
                const isHeader = /^(#{1,3} |\d\.\s*\*?\*?[A-Z])/.test(section);
                if (isHeader) {
                  const lines = section.split("\n");
                  const header = lines[0]
                    .replace(/^#{1,3}\s*/, "")
                    .replace(/^\d\.\s*/, "")
                    .replace(/\*\*/g, "");
                  const body = lines.slice(1).join("\n");
                  return (
                    <div key={i} className="mb-4">
                      <h3 className="text-accent-light font-semibold text-sm mb-1.5">
                        {header}
                      </h3>
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {body.trim()}
                      </p>
                    </div>
                  );
                }
                return (
                  <p key={i} className="mb-3">
                    {section}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {!coaching && !loading && !error && (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
              />
            </svg>
            <p className="text-sm">
              Click &quot;Get Coaching&quot; to receive AI-powered insights
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
