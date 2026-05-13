"use client";

import { useState } from "react";

const BROKERS = [
  {
    id: "robinhood",
    name: "Robinhood",
    status: "csv" as const,
    desc: "Import via CSV export from Statements & History.",
  },
  {
    id: "webull",
    name: "Webull",
    status: "csv" as const,
    desc: "Import via CSV export from Reports → Trade Details.",
  },
  {
    id: "schwab",
    name: "Charles Schwab",
    status: "coming" as const,
    desc: "API sync via Schwab Developer Portal. Requires API key setup.",
  },
  {
    id: "ibkr",
    name: "Interactive Brokers",
    status: "coming" as const,
    desc: "Flex query import. Configure a Flex Web Service query in Account Management.",
  },
  {
    id: "tastytrade",
    name: "Tastytrade",
    status: "coming" as const,
    desc: "API sync via Tastytrade Open API. Requires session token.",
  },
  {
    id: "thinkorswim",
    name: "thinkorswim (TDA)",
    status: "coming" as const,
    desc: "Import via exported trade log CSV.",
  },
];

export default function SyncPage() {
  const [file, setFile] = useState<File | null>(null);
  const [broker, setBroker] = useState("robinhood");
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setStatus(null);
    setIsError(false);

    try {
      const fd = new FormData();
      fd.append("broker", broker);
      fd.append("file", file);

      const res = await fetch("/api/import-trades", {
        method: "POST",
        body: fd,
      });

      const text = await res.text();
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }

      if (!res.ok) {
        setIsError(true);
        setStatus(String(body.error || body.details || "Import failed"));
      } else {
        setStatus(String(body.message || "Import successful!"));
        setFile(null);
      }
    } catch {
      setIsError(true);
      setStatus("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Broker Sync</h1>
        <p className="text-gray-500 text-sm">
          Import trades from your brokerage automatically or via CSV.
        </p>
      </div>

      {/* CSV Import */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold text-white mb-3">
          CSV Import
        </h2>
        <form
          onSubmit={handleImport}
          className="flex flex-col sm:flex-row items-start sm:items-end gap-4"
        >
          <div className="w-full sm:w-auto">
            <label className="label">Broker</label>
            <select
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              className="input-field"
            >
              {BROKERS.filter((b) => b.status === "csv").map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="label">CSV File</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0 file:text-sm file:font-medium
                         file:bg-surface-300 file:text-gray-200 hover:file:bg-surface-400
                         file:cursor-pointer file:transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !file}
            className="btn-primary text-sm shrink-0 disabled:opacity-50"
          >
            {loading ? "Importing..." : "Import"}
          </button>
        </form>

        {status && (
          <p
            className={`mt-3 text-sm ${isError ? "text-red-400" : "text-profit"}`}
          >
            {status}
          </p>
        )}
      </div>

      {/* Broker list */}
      <h2 className="text-lg font-semibold text-white mb-4">
        Supported Brokers
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {BROKERS.map((b) => (
          <div key={b.id} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">{b.name}</h3>
              <span
                className={`badge text-xs ${
                  b.status === "csv"
                    ? "bg-profit/15 text-profit"
                    : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {b.status === "csv" ? "CSV Ready" : "Coming Soon"}
              </span>
            </div>
            <p className="text-sm text-gray-500">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* Setup guide */}
      <div className="card p-6 mt-6">
        <h2 className="text-base font-semibold text-white mb-3">
          API Integration Setup Guide
        </h2>
        <div className="space-y-4 text-sm text-gray-400">
          <div>
            <h3 className="text-gray-200 font-medium mb-1">
              Charles Schwab API
            </h3>
            <p>
              1. Register at developer.schwab.com for an API key. 2. Create an
              app and get your client ID/secret. 3. Add the credentials to your
              environment variables. We will handle the OAuth flow and trade
              sync.
            </p>
          </div>
          <div>
            <h3 className="text-gray-200 font-medium mb-1">
              Interactive Brokers
            </h3>
            <p>
              1. Go to Account Management → Reports → Flex Queries. 2. Create a
              new Activity Flex Query selecting Trades. 3. Save the query token
              and add it to your environment variables.
            </p>
          </div>
          <div>
            <h3 className="text-gray-200 font-medium mb-1">Tastytrade</h3>
            <p>
              1. Log into the Tastytrade API sandbox at api.tastyworks.com. 2.
              Generate a session token with your credentials. 3. The API
              provides real-time positions and transaction history.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
