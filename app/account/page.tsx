'use client';
import { useEffect, useState } from 'react';

export default function AccountPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  async function refresh() {
    const res = await fetch('/api/account', { cache: 'no-store' });
    const j = await res.json();
    setBalance(j?.balance ?? 0);
  }

  useEffect(() => { refresh(); }, []);

  async function doAction(action: 'set'|'add'|'withdraw') {
    const label = action === 'set' ? 'Set portfolio size to…' : action === 'add' ? 'Amount to add…' : 'Amount to withdraw…';
    const v = prompt(label, '');
    if (v == null) return;
    const amount = Number(v);
    if (!Number.isFinite(amount) || (action !== 'set' && amount <= 0) || (action === 'set' && amount < 0)) {
      alert('Enter a valid amount');
      return;
    }
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, amount }),
    });
    if (!res.ok) {
      const t = await res.text();
      alert(`Update failed: ${t}`);
      return;
    }
    const j = await res.json();
    setBalance(j.balance);
    setOpen(false);
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Account</h1>
        <p className="text-gray-600">Your portfolio balance updates automatically when trades realize P&amp;L.</p>
      </div>

      <div className="relative bg-blue-50 border border-blue-200 rounded-lg p-6">
        <button
          onClick={() => setOpen((v) => !v)}
          className="absolute right-3 top-3 h-8 w-8 grid place-items-center rounded-md hover:bg-blue-100"
          aria-label="Edit"
          title="Edit"
        >
          ⋯
        </button>

        {open && (
          <div className="absolute right-3 top-12 z-10 w-44 rounded-md border bg-white shadow">
            <button onClick={() => doAction('set')} className="block w-full text-left px-3 py-2 hover:bg-gray-50">Set Port Size</button>
            <button onClick={() => doAction('add')} className="block w-full text-left px-3 py-2 hover:bg-gray-50">Add Money</button>
            <button onClick={() => doAction('withdraw')} className="block w-full text-left px-3 py-2 hover:bg-gray-50">Withdraw Money</button>
          </div>
        )}

        <h2 className="text-xl font-semibold text-blue-800 mb-2">Current Portfolio Balance</h2>
        <p className="text-3xl font-bold text-blue-900">
          {balance == null ? '—' : balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
        </p>
      </div>
    </main>
  );
}
