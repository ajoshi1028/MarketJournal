'use client'

import { useState } from 'react'

export default function AccountPage() {
  const [portfolioSize, setPortfolioSize] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [currentBalance, setCurrentBalance] = useState(10000) // Example starting balance

  const handleSetPortfolioSize = () => {
    const size = parseFloat(portfolioSize)
    if (!isNaN(size) && size > 0) {
      setCurrentBalance(size)
      setPortfolioSize('')
      alert(`Portfolio size set to $${size.toLocaleString()}`)
    } else {
      alert('Please enter a valid amount')
    }
  }

  const handleAddMoney = () => {
    const amount = parseFloat(addAmount)
    if (!isNaN(amount) && amount > 0) {
      setCurrentBalance(prev => prev + amount)
      setAddAmount('')
      alert(`Added $${amount.toLocaleString()} to your portfolio`)
    } else {
      alert('Please enter a valid amount')
    }
  }

  const handleWithdrawMoney = () => {
    const amount = parseFloat(withdrawAmount)
    if (!isNaN(amount) && amount > 0) {
      if (amount <= currentBalance) {
        setCurrentBalance(prev => prev - amount)
        setWithdrawAmount('')
        alert(`Withdrew $${amount.toLocaleString()} from your portfolio`)
      } else {
        alert('Insufficient funds')
      }
    } else {
      alert('Please enter a valid amount')
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Account</h1>
        <p className="text-gray-600">
          Manage your portfolio size and track your account balance.
        </p>
      </div>

      {/* Current Balance Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">Current Portfolio Balance</h2>
        <p className="text-3xl font-bold text-blue-900">
          ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Set Portfolio Size */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Input Port Size</h3>
        <p className="text-gray-600 mb-4">
          Set your initial portfolio size or reset your current balance.
        </p>
        <div className="flex gap-3">
          <input
            type="number"
            value={portfolioSize}
            onChange={(e) => setPortfolioSize(e.target.value)}
            placeholder="Enter portfolio size"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSetPortfolioSize}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Set Size
          </button>
        </div>
      </div>

      {/* Add Money */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Add Money to Port</h3>
        <p className="text-gray-600 mb-4">
          Add funds to increase your portfolio balance.
        </p>
        <div className="flex gap-3">
          <input
            type="number"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            placeholder="Enter amount to add"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleAddMoney}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Add Money
          </button>
        </div>
      </div>

      {/* Withdraw Money */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Withdraw Money from Port</h3>
        <p className="text-gray-600 mb-4">
          Withdraw funds from your portfolio balance.
        </p>
        <div className="flex gap-3">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Enter amount to withdraw"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={handleWithdrawMoney}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Withdraw Money
          </button>
        </div>
      </div>
    </main>
  )
}