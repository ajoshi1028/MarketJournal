"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Analytics = {
  overview: {
    totalTrades: number;
    closedTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    riskReward: number;
    expectancy: number;
    profitFactor: number;
    avgHoldDays: number;
    largestWin: number;
    largestLoss: number;
    grossProfit: number;
    grossLoss: number;
    netPnl: number;
  };
  streaks: { current: number; maxWin: number; maxLoss: number };
  byStrategy: { name: string; winRate: number; trades: number; pnl: number }[];
  byTicker: { name: string; winRate: number; trades: number; pnl: number }[];
  pnlByWeekday: { name: string; pnl: number; trades: number }[];
  monthlyPerformance: { month: string; pnl: number }[];
};

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);

  async function generatePDF() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/analytics/advanced", {
        cache: "no-store",
      });
      if (!res.ok) {
        alert("Failed to fetch analytics data");
        return;
      }
      const data: Analytics = await res.json();
      const o = data.overview;
      const s = data.streaks;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(22);
      doc.setTextColor(99, 102, 241);
      doc.text("Market Journal", 14, y);
      y += 8;

      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text("Performance Report", 14, y);

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }), pageWidth - 14, y, { align: "right" });
      y += 12;

      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, pageWidth - 14, y);
      y += 10;

      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.text("Overview", 14, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [
          ["Total Trades", String(o.totalTrades)],
          ["Closed Trades", String(o.closedTrades)],
          ["Net P&L", fmtUSD(o.netPnl)],
          ["Win Rate", `${o.winRate.toFixed(1)}%`],
          ["Avg Win", fmtUSD(o.avgWin)],
          ["Avg Loss", fmtUSD(o.avgLoss)],
          ["Risk/Reward", `1:${o.riskReward.toFixed(2)}`],
          ["Profit Factor", o.profitFactor.toFixed(2)],
          ["Expectancy", fmtUSD(o.expectancy)],
          ["Avg Hold Time", `${o.avgHoldDays.toFixed(1)} days`],
          ["Largest Win", fmtUSD(o.largestWin)],
          ["Largest Loss", fmtUSD(o.largestLoss)],
          ["Current Streak", s.current > 0 ? `${s.current}W` : s.current < 0 ? `${Math.abs(s.current)}L` : "—"],
          ["Best Win Streak", String(s.maxWin)],
        ],
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      y = ((doc as unknown as Record<string, { finalY: number }>).lastAutoTable?.finalY ?? y) + 12;

      if (data.byStrategy.length > 0) {
        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text("Performance by Strategy", 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Strategy", "Trades", "Win Rate", "P&L"]],
          body: data.byStrategy.map((s) => [
            s.name,
            String(s.trades),
            `${s.winRate.toFixed(1)}%`,
            fmtUSD(s.pnl),
          ]),
          theme: "striped",
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });

        y = ((doc as unknown as Record<string, { finalY: number }>).lastAutoTable?.finalY ?? y) + 12;
      }

      if (data.byTicker.length > 0) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text("Performance by Ticker", 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Ticker", "Trades", "Win Rate", "P&L"]],
          body: data.byTicker.slice(0, 15).map((t) => [
            t.name,
            String(t.trades),
            `${t.winRate.toFixed(1)}%`,
            fmtUSD(t.pnl),
          ]),
          theme: "striped",
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });

        y = ((doc as unknown as Record<string, { finalY: number }>).lastAutoTable?.finalY ?? y) + 12;
      }

      if (data.monthlyPerformance.length > 0) {
        if (y > 220) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text("Monthly Performance", 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Month", "P&L"]],
          body: data.monthlyPerformance.map((m) => [m.month, fmtUSD(m.pnl)]),
          theme: "striped",
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Market Journal Report — Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        );
      }

      doc.save(`market-journal-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      alert("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Reports</h1>
        <p className="text-gray-500 text-sm">
          Generate downloadable PDF performance reports.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-white mb-3">
          Performance Report
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          Generates a comprehensive PDF with your key metrics, strategy
          breakdown, ticker performance, and monthly P&L. Perfect for sharing
          with mentors or prop firms.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={generatePDF}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? "Generating..." : "Download PDF Report"}
          </button>
        </div>
      </div>
    </main>
  );
}
