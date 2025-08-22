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
  createdAt: string;
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trades', {
      headers: { 'x-user-id': 'demo-user' }
    })
      .then(res => res.json())
      .then(data => {
        setTrades(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading trades...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trade Journal</h1>
        <a 
          href="/" 
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add New Trade
        </a>
      </div>

      <div className="bg-white shadow rounded-lg">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{trade.ticker}</td>
                <td className="px-6 py-4 whitespace-nowrap">{trade.strategy || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{trade.positionType}</td>
                <td className="px-6 py-4 whitespace-nowrap">${trade.entryPrice}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    trade.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {trade.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(trade.entryDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}