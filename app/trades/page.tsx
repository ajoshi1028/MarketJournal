'use client';

import { useEffect, useState } from 'react';

interface Trade {
  id: string;
  ticker: string;
  strategy: string | null;
  positionType: string;
  status: string;
  entryDate: string;
  entryPrice: number;
  notes: string | null;
  aiCommentary: string | null;
  createdAt: string;
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingTradeId, setAnalyzingTradeId] = useState<string | null>(null);
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await fetch('/api/trades', {
        headers: { 'x-user-id': 'demo-user' }
      });
      const data = await response.json();
      setTrades(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setLoading(false);
    }
  };

  const analyzeTradeWithAI = async (tradeId: string) => {
    setAnalyzingTradeId(tradeId);
    try {
      const response = await fetch(`/api/trades/analyze/${tradeId}`, {
        method: 'POST',
        headers: { 'x-user-id': 'demo-user' }
      });
      
      if (response.ok) {
        const result = await response.json();
        await fetchTrades();
      } else {
        alert('AI analysis failed');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      alert('AI analysis failed');
    } finally {
      setAnalyzingTradeId(null);
    }
  };

  const deleteTrade = async (tradeId: string, ticker: string) => {
    if (!confirm(`Are you sure you want to delete the ${ticker} trade? This action cannot be undone.`)) {
      return;
    }

    setDeletingTradeId(tradeId);
    try {
      const response = await fetch(`/api/trades?id=${tradeId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'demo-user' }
      });

      if (response.ok) {
        setTrades(trades.filter(trade => trade.id !== tradeId));
        alert('Trade deleted successfully');
      } else {
        alert('Failed to delete trade');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete trade');
    } finally {
      setDeletingTradeId(null);
    }
  };

  if (loading) return <div className="max-w-6xl mx-auto p-8">Loading trades...</div>;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trade Journal</h1>
        <a 
          href="/" 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add New Trade
        </a>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No trades found. Start by adding your first trade.</p>
          <a 
            href="/" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Trade
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => (
            <div key={trade.id} className="bg-white shadow rounded-lg p-6">
              {/* Trade Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{trade.ticker}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      trade.status === 'OPEN' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {trade.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Strategy:</span>
                      <p className="font-medium">{trade.strategy || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Position:</span>
                      <p className="font-medium">{trade.positionType}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Entry Price:</span>
                      <p className="font-medium">${trade.entryPrice.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <p className="font-medium">{new Date(trade.entryDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => analyzeTradeWithAI(trade.id)}
                    disabled={analyzingTradeId === trade.id}
                    className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {analyzingTradeId === trade.id ? 'Analyzing...' : 'AI Analyze'}
                  </button>
                  
                  <button
                    onClick={() => deleteTrade(trade.id, trade.ticker)}
                    disabled={deletingTradeId === trade.id}
                    className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {deletingTradeId === trade.id ? 'Deleting...' : '🗑️ Delete'}
                  </button>
                </div>
              </div>

              {/* Notes */}
              {trade.notes && (
                <div className="mb-4">
                  <span className="text-gray-500 text-sm">Notes:</span>
                  <p className="text-gray-700 mt-1">{trade.notes}</p>
                </div>
              )}

              {/* AI Analysis */}
              {trade.aiCommentary && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-center mb-2">
                    <span className="text-purple-600 font-semibold text-sm">🤖 AI Analysis</span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{trade.aiCommentary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}