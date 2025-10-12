'use client'

import { useEffect, useRef, useState } from 'react'

export default function AccountPage() {
  const [currentBalance, setCurrentBalance] = useState(10000) // starting balance

  // menu + modal state
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<
    null | 'set' | 'add' | 'withdraw'
  >(null)

  // form amounts (blank by default)
  const [amount, setAmount] = useState<string>('')

  const menuRef = useRef<HTMLDivElement | null>(null)

  // close the menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function openAction(action: 'set' | 'add' | 'withdraw') {
    setActiveAction(action)
    setMenuOpen(false)
    setAmount('')
  }

  function closeModal() {
    setActiveAction(null)
    setAmount('')
  }

  function submitAction() {
    const val = parseFloat(amount)
    if (!Number.isFinite(val) || val <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (activeAction === 'set') {
      setCurrentBalance(val)
      alert(`Portfolio size set to $${val.toLocaleString()}`)
    } else if (activeAction === 'add') {
      setCurrentBalance((p) => p + val)
      alert(`Added $${val.toLocaleString()} to your portfolio`)
    } else if (activeAction === 'withdraw') {
      if (val > currentBalance) {
        alert('Insufficient funds')
        return
      }
      setCurrentBalance((p) => p - val)
      alert(`Withdrew $${val.toLocaleString()} from your portfolio`)
    }

    closeModal()
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Account</h1>
        <p className="text-gray-600">Your current portfolio balance.</p>
      </div>

      {/* Balance card with kebab menu */}
      <div className="relative bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-blue-800 mb-2">
              Current Portfolio Balance
            </h2>
            <p className="text-3xl font-bold text-blue-900">
              ${fmt(currentBalance)}
            </p>
          </div>

          {/* 3-dots menu */}
          <div className="relative" ref={menuRef}>
            <button
              aria-label="Edit"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-md text-blue-800 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {/* three dots icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg z-20">
                <div className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">
                  Edit
                </div>
                <button
                  onClick={() => openAction('set')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  Set Port Size
                </button>
                <button
                  onClick={() => openAction('add')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  Add Money
                </button>
                <button
                  onClick={() => openAction('withdraw')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  Withdraw Money
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {activeAction && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-1">
              {activeAction === 'set' && 'Set Portfolio Size'}
              {activeAction === 'add' && 'Add Money'}
              {activeAction === 'withdraw' && 'Withdraw Money'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {activeAction === 'set' &&
                'Set your total portfolio size to this amount.'}
              {activeAction === 'add' &&
                'Increase your portfolio balance by this amount.'}
              {activeAction === 'withdraw' &&
                'Decrease your portfolio balance by this amount.'}
            </p>

            <input
              type="number"
              inputMode="decimal"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
