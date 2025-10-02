'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export default function TradesPage() {
  const { user, isLoaded } = useUser()
  const [form, setForm] = useState({
    ticker: '',
    strategy: '',
    positionType: '',
    entryDate: '',
    entryPrice: '',
    maxRisk: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [trades, setTrades] = useState([])

  useEffect(() => {
    if (isLoaded && user) {
      fetchTrades()
    }
  }, [isLoaded, user])

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades')
      if (res.ok) {
        const data = await res.json()
        setTrades(data)
      }
    } catch (error) {
      console.error('Error fetching trades:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        alert('Trade submitted successfully!')
        setForm({
          ticker: '',
          strategy: '',
          positionType: '',
          entryDate: '',
          entryPrice: '',
          maxRisk: '',
          notes: '',
        })
        fetchTrades()
      } else {
        const error = await res.json()
        alert(`Submission failed: ${error.error}`)
      }
    } catch (error) {
      alert('Network error. Please try again.')
      console.error('Submission error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return <div className="max-w-6xl mx-auto p-8">Loading...</div>
  }

  return (
    <main className="max-w-6xl mx-auto p-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Add Trade Form */}
        <div>
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
                  <option value="">Select position type</option>
                  <option value="LONG">Long</option>
                  <option value="SHORT">Short</option>
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
                  Entry Price *
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
                  Max Risk
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
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes about this trade..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md transition-colors"
            >
              {loading ? 'Submitting...' : 'Add Trade'}
            </button>
          </form>
        </div>

        {/* Trades List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Trades</h2>
          <div className="space-y-4">
            {trades.length === 0 ? (
              <p className="text-gray-500">No trades recorded yet.</p>
            ) : (
              trades.map((trade: any) => (
                <div key={trade.id} className="bg-white p-4 rounded-lg shadow border">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{trade.ticker}</h3>
                    <span className={`px-2 py-1 rounded text-sm ${
                      trade.positionType === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.positionType}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-1">Strategy: {trade.strategy || 'N/A'}</p>
                  <p className="text-gray-600 mb-1">Entry: ${trade.entryPrice}</p>
                  <p className="text-gray-600 mb-1">Date: {new Date(trade.entryDate).toLocaleDateString()}</p>
                  {trade.notes && <p className="text-gray-500 text-sm mt-2">{trade.notes}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}