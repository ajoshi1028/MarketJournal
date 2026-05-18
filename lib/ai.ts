import OpenAI from "openai";

export async function analyzeTradeChart(
  chartUrl: string,
  trade: {
    ticker: string;
    positionType: string;
    optionType?: string | null;
    strike?: number | null;
    expiry?: Date | string | null;
    strategy?: string | null;
    entryDate: Date | string;
    entryTime?: string | null;
    sellDate?: Date | string | null;
    exitTime?: string | null;
    totalBuyQty?: number | null;
    avgBuyPrice?: number | null;
    totalSellQty?: number | null;
    avgSellPrice?: number | null;
    realizedPnl?: number | null;
    outcome?: string | null;
    notes?: string | null;
  },
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const toIso = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
  };

  const toExpiry = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
  };

  const optionDesc = trade.optionType && trade.strike
    ? `${trade.strike} ${trade.optionType}${trade.expiry ? ` exp ${toExpiry(trade.expiry)}` : ""}`
    : "—";

  const entryTimeStr = trade.entryTime ? ` at ${trade.entryTime}` : "";
  const exitTimeStr = trade.exitTime ? ` at ${trade.exitTime}` : "";

  const prompt = [
    "Analyze this trade's chart. The trader entered a specific option contract — use the entry/exit times to identify where on the chart they got in and out. Give strengths, weaknesses, and one improvement. ~200 words.",
    "",
    `Ticker: ${trade.ticker}`,
    `Option: ${optionDesc}`,
    `Position: ${trade.positionType}`,
    `Strategy: ${trade.strategy ?? "—"}`,
    `Entry: ${toIso(trade.entryDate)}${entryTimeStr}`,
    `Exit: ${toIso(trade.sellDate)}${exitTimeStr}`,
    `Buys: ${trade.totalBuyQty ?? 0} @ ${trade.avgBuyPrice ?? "—"}`,
    `Sells: ${trade.totalSellQty ?? 0} @ ${trade.avgSellPrice ?? "—"}`,
    `Realized P&L: ${trade.realizedPnl ?? 0}`,
    `Outcome: ${trade.outcome ?? "—"}`,
    `Notes: ${trade.notes ?? "—"}`,
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: chartUrl } },
        ],
      },
    ],
  });

  return completion.choices?.[0]?.message?.content?.trim() || "";
}
