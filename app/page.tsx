'use client';

import { useState } from 'react';

export default function HomePage() {
  const [form, setForm] = useState({
    ticker: '',
    strategy: '',
    positionType: '',
    entryDate: '',
    entryPrice: '',
    maxRisk: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        alert('Trade submitted successfully!');
        setForm({
          ticker: '',
          strategy: '',
          positionType: '',
          entryDate: '',
          entryPrice: '',
          maxRisk: '',
          notes: '',
        });
        // Redirect to trades list
        window.location.href = '/trades';
      } else {
        const error = await res.json();
        alert(`Submission failed: ${error.error}`);
      }
    } catch (error) {
      alert('Network error. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Add Trade Entry</h1>
        <p className="text-gray-600">
          Record your trading activity for analysis and review.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticker Symbol *
            </label>
            <input
              type="text"
              name="ticker"
              value={form.ticker}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., AAPL"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strategy
            </label>
            <input
              type="text"
              name="strategy"
              value={form.strategy}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Put Credit Spread"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position Type *
            </label>
            <select
              name="positionType"
              value={form.positionType}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select type</option>
              <option value="LONG">Long</option>
              <option value="SHORT">Short</option>
              <option value="CREDIT_SPREAD">Credit Spread</option>
              <option value="DEBIT_SPREAD">Debit Spread</option>
              <option value="IRON_CONDOR">Iron Condor</option>
              <option value="STRADDLE">Straddle</option>
              <option value="STRANGLE">Strangle</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entry Date *
            </label>
            <input
              type="date"
              name="entryDate"
              value={form.entryDate}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entry Price * ($)
            </label>
            <input
              type="number"
              step="0.01"
              name="entryPrice"
              value={form.entryPrice}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Risk ($)
            </label>
            <input
              type="number"
              step="0.01"
              name="maxRisk"
              value={form.maxRisk}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Trade rationale, market conditions, etc."
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Add Trade'}
          </button>

          <a
            href="/trades"
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 text-center flex items-center justify-center"
          >
            View All Trades
          </a>
        </div>
      </form>
    </main>
  );
}