"use client";

import { useState } from "react";

const BROKERS = ["Robinhood", "Webull"] as const;
type Broker = (typeof BROKERS)[number];

export default function ImportTrades({
  onImported,
}: {
  onImported?: () => void;
}) {
  const [broker, setBroker] = useState<Broker>("Robinhood");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setIsError(false);

    if (!file) {
      setStatus("Please choose a CSV file first.");
      setIsError(true);
      return;
    }

    try {
      setLoading(true);
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
        setStatus(
          String(body.error || body.details || body.raw || "Unknown error"),
        );
      } else {
        setStatus(String(body.message || "Import successful."));
        setFile(null);
        onImported?.();
      }
    } catch (err: unknown) {
      setIsError(true);
      setStatus(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold text-white mb-2">
        Import Trades from Broker
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Export your trade history CSV from Robinhood or Webull, then upload it
        to automatically create journal entries.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row items-start md:items-end gap-4"
      >
        <div className="flex-1">
          <label htmlFor="import-broker" className="label">Broker</label>
          <select
            id="import-broker"
            value={broker}
            onChange={(e) => setBroker(e.target.value as Broker)}
            className="input-field"
          >
            {BROKERS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="import-csv" className="label">CSV File</label>
          <input
            id="import-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0 file:text-sm file:font-medium
                       file:bg-surface-300 file:text-gray-200 hover:file:bg-surface-400
                       file:cursor-pointer file:transition-colors"
          />
          {file && (
            <p className="mt-1 text-xs text-gray-500">
              {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {loading ? "Importing..." : "Import Trades"}
        </button>
      </form>

      {status && (
        <p
          className={`mt-3 text-sm ${isError ? "text-red-400" : "text-profit"}`}
        >
          {status}
        </p>
      )}

      <div className="mt-4 text-xs text-gray-600 space-y-1">
        <p className="font-semibold text-gray-500">How to export:</p>
        <p>
          <span className="text-gray-400">Robinhood:</span> Account →
          Statements & History → download trade history CSV.
        </p>
        <p>
          <span className="text-gray-400">Webull:</span> Account → Reports →
          Trade details / order history → export CSV.
        </p>
      </div>
    </section>
  );
}
