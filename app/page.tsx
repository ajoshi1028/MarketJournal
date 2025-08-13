"use client";

import { useState } from "react";

export default function HomePage() {
  const [form, setForm] = useState({
    ticker: "",
    strategy: "",
    positionType: "",
    entryDate: "",
    entryPrice: "",
    maxRisk: "",
    notes: "",
    userId: "temp-user-id", // Add this required field
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      alert("Trade submitted!");
      setForm({
        ticker: "",
        strategy: "",
        positionType: "",
        entryDate: "",
        entryPrice: "",
        maxRisk: "",
        notes: "",
        userId: "temp-user-id", // Keep userId in reset
      });
    } else {
      alert("Submission failed.");
    }
  };

  return (
    <main className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Add Trade Entry</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {Object.entries(form).map(([key, value]) => (
          <div key={key}>
            <label className="block capitalize">{key}</label>
            {key === "notes" ? (
              <textarea
                name={key}
                value={value}
                onChange={handleChange}
                className="border p-2 w-full"
              />
            ) : (
              <input
                type={key.includes("Date") ? "date" : "text"}
                name={key}
                value={value}
                onChange={handleChange}
                className="border p-2 w-full"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Submit Trade
        </button>
      </form>
    </main>
  );
}
