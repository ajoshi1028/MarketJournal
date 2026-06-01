// app/api/import-trades/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import Papa from "papaparse";

/* ---------- Canonical types ---------- */

type Side = "BUY" | "SELL";

type CanonicalFill = {
  broker: string;
  raw: any;
  instrument: string;         // e.g. "QQQ"
  description: string | null; // e.g. "QQQ 11/10/2025 Put 616.00"
  side: Side;
  quantity: number;
  price: number;
  amount: number;             // +credit for sells, -debit for buys (incl. fees if available)
  tradeDate: Date;
};

type Fill = { qty: number; price: number };

type Group = {
  key: string;
  ticker: string;
  description: string | null;
  buys: Fill[];
  sells: Fill[];
  firstBuyDate: Date | null;
  lastSellDate: Date | null;
  netAmount: number;
};

/* ---------- Small helpers ---------- */

function parseMoney(str: string | undefined | null): number {
  if (!str) return 0;
  const trimmed = String(str).trim();
  const isNegative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const noSymbols = trimmed.replace(/[,$()]/g, "");
  const n = Number(noSymbols);
  if (!Number.isFinite(n)) return 0;
  return isNegative ? -n : n;
}

function parseNumber(str: string | undefined | null): number | null {
  if (!str) return null;
  const cleaned = String(str)
    .replace(/[$,]/g, "")  // remove $ and commas
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(str: string | undefined | null): Date | null {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;

  // Try MM/DD/YYYY or MM-DD-YYYY (common broker formats)
  const parts = s.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const mm = Number(a);
    const dd = Number(b);
    const yyyy = Number(c.length === 2 ? "20" + c : c);
    if (!Number.isNaN(mm) && !Number.isNaN(dd) && !Number.isNaN(yyyy)) {
      const d = new Date(yyyy, mm - 1, dd);
      if (!Number.isNaN(+d)) return d;
    }
  }

  // Fallback to native parser
  const d = new Date(s);
  return Number.isNaN(+d) ? null : d;
}

function weightedAvg(fills: Fill[]): number | null {
  const totalQty = fills.reduce((s, f) => s + f.qty, 0);
  if (totalQty === 0) return null;
  const value = fills.reduce((s, f) => s + f.price * f.qty, 0);
  return value / totalQty;
}

/* ---------- Header utilities ---------- */

// Normalize header: lowercase + remove spaces so we can fuzzy-match
function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

function buildHeaderIndex(sampleRow: any): Record<string, string> {
  const index: Record<string, string> = {};
  if (!sampleRow) return index;
  for (const key of Object.keys(sampleRow)) {
    index[normHeader(key)] = key;
  }
  return index;
}

function findColumn(
  index: Record<string, string>,
  candidates: string[]
): string | null {
  // Exact matches on normalized header
  for (const cand of candidates) {
    const n = normHeader(cand);
    if (index[n]) return index[n];
  }
  // Fallback: partial includes on normalized header
  for (const [norm, original] of Object.entries(index)) {
    if (candidates.some((c) => norm.includes(normHeader(c)))) {
      return original;
    }
  }
  return null;
}

/* ---------- Robinhood-specific mapper (your CSV) ---------- */

function mapRobinhoodRowsToFills(rows: any[], broker: string): CanonicalFill[] {
  if (!rows.length) return [];

  // We know the exact columns from your screenshot:
  // Activity Date, Process Date, Settle Date, Instrument, Description,
  // Trans Code, Quantity, Price, Amount
  const fills: CanonicalFill[] = [];
  const TRADE_CODES = new Set(["BTO", "STC", "STO", "BTC"]);

  for (const row of rows) {
    const code = String(row["Trans Code"] ?? "").toUpperCase().trim();
    const inst = String(row["Instrument"] ?? "").trim();
    if (!inst || !code) continue;
    if (!TRADE_CODES.has(code)) continue; // skip RTP, ACH, GOLD, etc.

    const qty = parseNumber(row["Quantity"]);
    const price = parseNumber(row["Price"]);
    if (!qty || !price) continue;

    const amount = parseMoney(row["Amount"]);
    const d =
      parseDate(row["Settle Date"]) ??
      parseDate(row["Activity Date"]) ??
      new Date();

    let side: Side = "BUY";
    if (code === "BTO" || code === "BTC") side = "BUY";
    else if (code === "STC" || code === "STO") side = "SELL";

    fills.push({
      broker,
      raw: row,
      instrument: inst.toUpperCase(),
      description: row["Description"]?.toString() ?? null,
      side,
      quantity: qty,
      price,
      amount, // Robinhood already has sign: negative for buys, positive for sells
      tradeDate: d,
    });
  }

  return fills;
}

/* ---------- Generic CSV → canonical fills (other brokers) ---------- */

function mapRowsToCanonicalFills(rows: any[], broker: string): CanonicalFill[] {
  if (!rows.length) return [];
  const headerIndex = buildHeaderIndex(rows[0]);

  let colSymbol =
    findColumn(headerIndex, ["Symbol", "Ticker", "Instrument", "Security"]) ??
    null;

  let colSide =
    findColumn(headerIndex, [
      "Side",
      "Action",
      "Type",
      "Transaction",
      "Trans Code",
      "TransCode",
      "Trade Type",
    ]) ?? null;

  const colQty =
    findColumn(headerIndex, ["Quantity", "Qty", "Shares", "Contracts"]) ?? null;
  const colPrice =
    findColumn(headerIndex, ["Price", "Fill Price", "Avg Price"]) ?? null;
  const colAmount =
    findColumn(headerIndex, [
      "Amount",
      "Total",
      "Proceeds",
      "Net",
      "Cash Amount",
    ]) ?? null;
  const colDate =
    findColumn(headerIndex, [
      "Activity Date",
      "Process Date",
      "Settle Date",
      "Date",
      "Time",
      "Filled",
      "Executed",
      "Trade Date",
    ]) ?? null;
  const colDesc =
    findColumn(headerIndex, ["Description", "Product", "Details"]) ?? null;

  if (!colSymbol) {
    const possible = Object.values(headerIndex).find((h) =>
      /symbol|ticker|instrument|security/i.test(h)
    );
    if (possible) colSymbol = possible;
  }

  if (!colSymbol || !colSide || !colQty || !colPrice) {
    return [];
  }

  const fills: CanonicalFill[] = [];

  for (const row of rows) {
    const symRaw = row[colSymbol];
    const sideRaw = String(row[colSide] ?? "").toUpperCase().trim();
    const qty = parseNumber(row[colQty]);
    const price = parseNumber(row[colPrice]);

    if (!symRaw || !qty || !price) continue;

    let side: Side | null = null;

    if (sideRaw.includes("BUY") || sideRaw === "B") {
      side = "BUY";
    } else if (sideRaw.includes("SELL") || sideRaw === "S") {
      side = "SELL";
    } else if (["BTO", "BTC"].includes(sideRaw)) {
      side = "BUY";
    } else if (["STC", "STO"].includes(sideRaw)) {
      side = "SELL";
    }

    if (!side) continue;

    let amount = 0;
    if (colAmount) {
      amount = parseMoney(row[colAmount]);
      if (amount === 0) {
        amount = side === "BUY" ? -(qty * price) : qty * price;
      }
    } else {
      amount = side === "BUY" ? -(qty * price) : qty * price;
    }

    const parsedTradeDate = colDate ? parseDate(row[colDate]) : null;
    const tradeDate: Date = parsedTradeDate ?? new Date();

    fills.push({
      broker,
      raw: row,
      instrument: String(symRaw).toUpperCase(),
      description: colDesc ? row[colDesc]?.toString() ?? null : null,
      side,
      quantity: qty,
      price,
      amount,
      tradeDate,
    });
  }

  return fills;
}

/* ---------- Main API route ---------- */

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { success } = await rateLimit(`import:${userId}`, 5, 60 * 60 * 1000);
    if (!success)
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const broker = String(formData.get("broker") || "Generic");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No CSV file uploaded" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "CSV file too large (10 MB max)" },
        { status: 400 }
      );
    }

    const allowedMimes = new Set(["text/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"]);
    if (file.type && !allowedMimes.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a CSV file." },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    // Ignore TooManyFields/TooFewFields, but treat others as fatal
    const fatalErrors = parsed.errors.filter(
      (e) => e.code !== "TooManyFields" && e.code !== "TooFewFields"
    );
    if (fatalErrors.length) {
      return NextResponse.json(
        {
          error: "Failed to parse CSV",
          details: fatalErrors[0]?.message ?? "Unknown parse error",
        },
        { status: 400 }
      );
    }

    const rows = parsed.data as any[];

    if (!rows.length) {
      return NextResponse.json(
        { error: "CSV appears to be empty" },
        { status: 400 }
      );
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { error: "CSV too large (5,000 row max). Please split into smaller files." },
        { status: 400 }
      );
    }

    // 1) Try Robinhood-specific mapping first (your file)
    let fills: CanonicalFill[] = [];
    const headers = Object.keys(rows[0] || {});

    const looksLikeRobinhood =
      headers.includes("Instrument") &&
      headers.includes("Trans Code") &&
      headers.includes("Quantity") &&
      headers.includes("Price");

    if (looksLikeRobinhood) {
      fills = mapRobinhoodRowsToFills(rows, "Robinhood");
    }

    // 2) Fall back to generic mapper for any other broker / unknown layouts
    if (!fills.length) {
      fills = mapRowsToCanonicalFills(rows, broker);
    }

    if (!fills.length) {
      return NextResponse.json(
        {
          error:
            "No trade-like rows detected in CSV. Could not find columns like symbol/ticker, side/action, quantity, and price.",
          headers,
        },
        { status: 400 }
      );
    }

    // 3) Group canonical fills into trades
    const groups = new Map<string, Group>();

    for (const f of fills) {
      const desc = f.description ?? "";
      const key = `${f.instrument}|${desc}`;

      let g = groups.get(key);
      if (!g) {
        g = {
          key,
          ticker: f.instrument,
          description: f.description,
          buys: [],
          sells: [],
          firstBuyDate: null,
          lastSellDate: null,
          netAmount: 0,
        };
        groups.set(key, g);
      }

      g.netAmount += f.amount;
      const fill: Fill = { qty: f.quantity, price: f.price };

      if (f.side === "BUY") {
        g.buys.push(fill);
        if (!g.firstBuyDate || f.tradeDate < g.firstBuyDate) {
          g.firstBuyDate = f.tradeDate;
        }
      } else {
        g.sells.push(fill);
        if (!g.lastSellDate || f.tradeDate > g.lastSellDate) {
          g.lastSellDate = f.tradeDate;
        }
      }
    }

    // Parse option details from description like "QQQ 5/21/2026 Put $712.00"
    function parseOptionFromDesc(desc: string | null): {
      optionType: "CALL" | "PUT" | null;
      strike: number | null;
      expiry: Date | null;
    } {
      if (!desc) return { optionType: null, strike: null, expiry: null };
      const callMatch = /\bCall\b/i.test(desc);
      const putMatch = /\bPut\b/i.test(desc);
      const optionType = callMatch ? "CALL" as const : putMatch ? "PUT" as const : null;

      // Try to extract strike price (number after Call/Put, or $ prefixed)
      let strike: number | null = null;
      const strikeMatch = desc.match(/(?:Call|Put)\s+\$?([\d,]+(?:\.\d+)?)/i);
      if (strikeMatch) {
        strike = parseFloat(strikeMatch[1].replace(/,/g, ""));
        if (!Number.isFinite(strike)) strike = null;
      }

      // Try to extract expiry date from description
      const dateMatch = desc.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      let expiry: Date | null = null;
      if (dateMatch) {
        expiry = parseDate(dateMatch[1]);
      }

      return { optionType, strike, expiry };
    }

    const tradesToCreate: any[] = [];

    for (const g of groups.values()) {
      const totalBuyQty = g.buys.reduce((s, f) => s + f.qty, 0);
      const totalSellQty = g.sells.reduce((s, f) => s + f.qty, 0);

      if (totalBuyQty === 0 && totalSellQty === 0) continue;

      const avgBuyPrice = weightedAvg(g.buys);
      const avgSellPrice = weightedAvg(g.sells);
      const realizedPnl = g.netAmount;

      let outcome: "PROFIT" | "LOSS" | null = null;
      if (realizedPnl > 0) outcome = "PROFIT";
      else if (realizedPnl < 0) outcome = "LOSS";

      const { optionType, strike, expiry } = parseOptionFromDesc(g.description);

      const positionType: "LONG" | "SHORT" =
        optionType === "PUT" ? "SHORT" : "LONG";

      tradesToCreate.push({
        userId,
        ticker: g.ticker,
        strategy: g.description?.slice(0, 80) ?? null,
        positionType,
        optionType,
        strike,
        expiry,
        entryDate: g.firstBuyDate ?? g.lastSellDate ?? new Date(),
        sellDate: g.lastSellDate ?? g.firstBuyDate ?? null,
        buyFills: g.buys.length ? g.buys : undefined,
        sellFills: g.sells.length ? g.sells : undefined,
        totalBuyQty,
        totalSellQty,
        avgBuyPrice,
        avgSellPrice,
        realizedPnl,
        outcome,
        notes: g.description,
      });
    }

    if (!tradesToCreate.length) {
      return NextResponse.json(
        {
          error:
            "CSV was parsed, but we couldn't build any trades (buys/sells were missing).",
        },
        { status: 400 }
      );
    }

    const created = await prisma.tradeEntry.createMany({
      data: tradesToCreate,
    });

    return NextResponse.json(
      {
        message: `Imported ${created.count} trades from ${broker}.`,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Import failed. Please check your file format and try again." },
      { status: 500 }
    );
  }
}
