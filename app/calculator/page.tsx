'use client'

import React, { useState } from 'react';

interface InputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}

interface CalculationResult {
  maxRisk: number;
  positionSize: number;
  sharesOrContracts: number;
  stopLoss: number;
  takeProfit: number;
}

export default function CalculatorPage(): JSX.Element {
  const [accountSize, setAccountSize] = useState<string>('');
  const [riskPercentage, setRiskPercentage] = useState<string>('');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [riskRewardRatio, setRiskRewardRatio] = useState<string>('');

  const calculatePositionSize = (): CalculationResult | null => {
    const account = parseFloat(accountSize);
    const riskPct = parseFloat(riskPercentage);
    const entry = parseFloat(entryPrice);
    const stopLoss = parseFloat(stopLossPrice);
    const target = parseFloat(targetPrice);
    const rrRatio = parseFloat(riskRewardRatio);

    if (!account || !riskPct || !entry) return null;

    const maxRisk = (account * riskPct) / 100;
    
    let actualStopLoss = stopLoss;
    let actualTarget = target;
    
    if (!stopLoss && rrRatio && target) {
      const targetDistance = Math.abs(target - entry);
      const stopDistance = targetDistance / rrRatio;
      actualStopLoss = entry > target ? entry + stopDistance : entry - stopDistance;
    } else if (!target && rrRatio && stopLoss) {
      const stopDistance = Math.abs(entry - stopLoss);
      const targetDistance = stopDistance * rrRatio;
      actualTarget = entry > stopLoss ? entry + targetDistance : entry - targetDistance;
    }

    if (!actualStopLoss) return null;

    const riskPerShare = Math.abs(entry - actualStopLoss);
    const sharesOrContracts = Math.floor(maxRisk / riskPerShare);
    const positionSize = sharesOrContracts * entry;

    return {
      maxRisk,
      positionSize,
      sharesOrContracts,
      stopLoss: actualStopLoss,
      takeProfit: actualTarget || 0,
    };
  };

  const result = calculatePositionSize();

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
        Position Size Calculator
      </h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Trade Parameters</h2>
          
          <Input
            label="Account Size ($)"
            value={accountSize}
            onChange={setAccountSize}
            placeholder="10000"
          />
          
          <Input
            label="Risk Percentage (%)"
            value={riskPercentage}
            onChange={setRiskPercentage}
            placeholder="2"
          />
          
          <Input
            label="Entry Price ($)"
            value={entryPrice}
            onChange={setEntryPrice}
            placeholder="150.00"
          />
          
          <Input
            label="Stop Loss Price ($)"
            value={stopLossPrice}
            onChange={setStopLossPrice}
            placeholder="145.00"
          />
          
          <Input
            label="Target Price ($) - Optional"
            value={targetPrice}
            onChange={setTargetPrice}
            placeholder="160.00"
          />
          
          <Input
            label="Risk/Reward Ratio - Optional"
            value={riskRewardRatio}
            onChange={setRiskRewardRatio}
            placeholder="3"
          />
        </div>

        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Calculation Results</h2>
          
          {result ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded border">
                <div className="text-sm text-gray-600">Maximum Risk</div>
                <div className="text-2xl font-bold text-red-600">
                  ${result.maxRisk.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border">
                <div className="text-sm text-gray-600">Position Size</div>
                <div className="text-2xl font-bold text-blue-600">
                  ${result.positionSize.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border">
                <div className="text-sm text-gray-600">Shares/Contracts</div>
                <div className="text-2xl font-bold text-green-600">
                  {result.sharesOrContracts}
                </div>
              </div>
              
              {result.stopLoss > 0 && (
                <div className="bg-white p-4 rounded border">
                  <div className="text-sm text-gray-600">Stop Loss</div>
                  <div className="text-xl font-semibold text-red-500">
                    ${result.stopLoss.toFixed(2)}
                  </div>
                </div>
              )}
              
              {result.takeProfit > 0 && (
                <div className="bg-white p-4 rounded border">
                  <div className="text-sm text-gray-600">Take Profit</div>
                  <div className="text-xl font-semibold text-green-500">
                    ${result.takeProfit.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              Enter the required parameters to see calculations
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Input({ label, value, onChange, type = "number", placeholder }: InputProps): JSX.Element {
  return (
    <label className="block mb-4">
      <span className="font-medium text-gray-700">{label}</span>
      <input
        type={type}
        step={type === "number" ? "any" : undefined}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        className="mt-1 w-full p-2 border text-gray-950 border-gray-950 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-500"
      />
    </label>
  );
}