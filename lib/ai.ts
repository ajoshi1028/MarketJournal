import OpenAI from "openai";

export async function analyzeTradeChart(
  chartUrl: string,
  trade: {
    ticker: string;
    positionType: string;
    strategy?: string | null;
    entryDate: Date | string;
    sellDate?: Date | string | null;
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
    return d instanceof Date ? d.toISOString() : String(d);
  };

  const prompt = [
    "Analyze this trade's chart. Give strengths, weaknesses, and one improvement. ~180 words.",
    "",
    `Ticker: ${trade.ticker}`,
    `Position: ${trade.positionType}`,
    `Strategy: ${trade.strategy ?? "—"}`,
    `Entry: ${toIso(trade.entryDate)}`,
    `Exit: ${toIso(trade.sellDate)}`,
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
