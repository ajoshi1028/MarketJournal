"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type NewsItem = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  tickers: string[];
};

type NewsResponse = {
  items: NewsItem[];
  symbols: string[];
  asOf: string;
};

const DEFAULT_INPUT = "SPY, QQQ, NVDA, TSLA, AAPL";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EdgeNewsPage() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const fetchNews = useCallback(async (symbolsCsv: string) => {
    setLoading(true);
    setError(null);
    setUpgradeRequired(false);
    try {
      const symbols = symbolsCsv
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .join(",");
      const res = await fetch(`/api/edge/news?symbols=${encodeURIComponent(symbols)}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.upgradeRequired) setUpgradeRequired(true);
        else setError(body.error || "Failed to load news.");
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setError("Network error loading news.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(DEFAULT_INPUT);
  }, [fetchNews]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8 border-b border-surface-300 pb-6">
        <p className="kicker mb-3">Edge · 03</p>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white">News</h1>
        <p className="font-mono text-xs text-gray-500 mt-3">
          Ticker-tagged headlines across your watchlist, newest first.
        </p>
        <div className="mt-4 flex gap-4 font-mono text-[11px] uppercase tracking-[0.2em]">
          <Link href="/edge" className="text-gray-500 hover:text-gray-300 transition-colors">
            01 Flow
          </Link>
          <Link href="/edge/gex" className="text-gray-500 hover:text-gray-300 transition-colors">
            02 Exposure
          </Link>
          <span className="text-accent-light">03 News</span>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchNews(input);
        }}
        className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="news-symbols" className="label">
            Symbols (comma separated, max 6)
          </label>
          <input
            id="news-symbols"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input-field font-mono uppercase"
            placeholder="SPY, NVDA, TSLA"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? "Loading..." : "Refresh"}
        </button>
      </form>

      {upgradeRequired && (
        <div className="card p-8 text-center">
          <p className="kicker mb-3">Pro feature</p>
          <h2 className="text-xl font-light text-white mb-2">The news feed is part of Pro</h2>
          <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
            Watchlist-aware market headlines alongside your flow and exposure
            data — one screen for the whole picture.
          </p>
          <Link href="/billing" className="btn-primary inline-block">
            Upgrade to Pro — $19.99/mo
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-4 border border-red-500/30 bg-loss-muted px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!upgradeRequired && !error && (
        <div className="card">
          <div className="panel-head">
            <span>Headlines</span>
            <span>{data ? `as of ${new Date(data.asOf).toLocaleTimeString()}` : "—"}</span>
          </div>
          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-10 bg-surface-200" />
                ))}
              </div>
            </div>
          ) : data && data.items.length > 0 ? (
            <div className="divide-y divide-surface-300">
              {data.items.map((n) => (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-3 hover:bg-surface-200/40 transition-colors group"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm text-gray-200 group-hover:text-white transition-colors leading-snug">
                      {n.title}
                    </p>
                    <span className="font-mono text-[10px] text-gray-600 shrink-0">
                      {relativeTime(n.publishedAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      {n.publisher}
                    </span>
                    <span className="flex gap-1.5">
                      {n.tickers.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[10px] px-1.5 py-0.5 bg-surface-300 text-accent-light"
                        >
                          {t}
                        </span>
                      ))}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              No headlines found for these symbols right now.
            </div>
          )}
        </div>
      )}

      <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-gray-600">
        Headlines link to external publishers — not financial advice.
      </p>
    </main>
  );
}
