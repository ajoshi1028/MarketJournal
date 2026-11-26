/**
 * Persists broker-imported positions idempotently: positions already imported
 * (matched by importKey) are updated instead of duplicated, and trades from
 * before import keys existed are recognized and adopted.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { dayKey, type ImportedTrade } from "./positions";

type Existing = {
  id: string;
  totalBuyQty: number | null;
  totalSellQty: number | null;
  realizedPnl: number | null;
  outcome: string | null;
  sellDate: Date | null;
};

const existingSelect = {
  id: true,
  totalBuyQty: true,
  totalSellQty: true,
  realizedPnl: true,
  outcome: true,
  sellDate: true,
} as const;

const positionFields = (t: ImportedTrade) => ({
  optionType: t.optionType,
  strike: t.strike,
  expiry: t.expiry,
  entryDate: t.entryDate,
  sellDate: t.sellDate,
  totalBuyQty: t.totalBuyQty,
  totalSellQty: t.totalSellQty,
  avgBuyPrice: t.avgBuyPrice,
  avgSellPrice: t.avgSellPrice,
  realizedPnl: t.realizedPnl,
  outcome: t.outcome,
});

const sameNumber = (a: number | null, b: number | null) =>
  a === b || (a !== null && b !== null && Math.abs(a - b) < 0.005);

const changed = (row: Existing, t: ImportedTrade) =>
  row.totalBuyQty !== t.totalBuyQty ||
  row.totalSellQty !== t.totalSellQty ||
  row.outcome !== t.outcome ||
  !sameNumber(row.realizedPnl, t.realizedPnl) ||
  (row.sellDate?.getTime() ?? null) !== (t.sellDate?.getTime() ?? null);

export async function syncImportedTrades(
  userId: string,
  built: ImportedTrade[],
): Promise<{ created: number; updated: number; unchanged: number }> {
  const matched = new Map<string, { row: Existing; adopt: boolean }>();

  const keyed = await prisma.tradeEntry.findMany({
    where: { userId, importKey: { in: built.map((t) => t.importKey) } },
    select: { ...existingSelect, importKey: true },
  });
  for (const row of keyed) matched.set(row.importKey!, { row, adopt: false });

  // Trades imported before import keys existed have no key. Recognize them by
  // contract text and the date the old importer stored as entryDate (first
  // buy, else last sell), and adopt them so their P&L gets corrected.
  const unkeyed = built.filter((t) => !matched.has(t.importKey) && t.description);
  if (unkeyed.length) {
    const legacy = await prisma.tradeEntry.findMany({
      where: {
        userId,
        importKey: null,
        ticker: { in: Array.from(new Set(unkeyed.map((t) => t.ticker))) },
        notes: { in: Array.from(new Set(unkeyed.map((t) => t.description!))) },
      },
      select: { ...existingSelect, ticker: true, notes: true, entryDate: true },
    });
    const claimed = new Set<string>();
    for (const t of unkeyed) {
      const legacyDate = t.firstBuyDate ?? t.lastSellDate;
      if (!legacyDate) continue;
      const row = legacy.find(
        (r) =>
          !claimed.has(r.id) &&
          r.ticker === t.ticker &&
          r.notes === t.description &&
          dayKey(r.entryDate) === dayKey(legacyDate),
      );
      if (row) {
        claimed.add(row.id);
        matched.set(t.importKey, { row, adopt: true });
      }
    }
  }

  const toCreate = built.filter((t) => !matched.has(t.importKey));
  const toUpdate = built.filter((t) => {
    const m = matched.get(t.importKey);
    return m && (m.adopt || changed(m.row, t));
  });

  // User-entered fields (notes, strategy, tags, chart, AI analysis) are never
  // overwritten on update — only what the broker data determines.
  const [created] = await prisma.$transaction([
    prisma.tradeEntry.createMany({
      data: toCreate.map((t) => ({
        userId,
        importKey: t.importKey,
        ticker: t.ticker,
        strategy: t.description?.slice(0, 80) ?? null,
        positionType: t.optionType === "PUT" ? "SHORT" : "LONG",
        notes: t.description,
        buyFills: t.buyFills.length ? t.buyFills : undefined,
        sellFills: t.sellFills.length ? t.sellFills : undefined,
        ...positionFields(t),
      })),
      skipDuplicates: true,
    }),
    ...toUpdate.map((t) =>
      prisma.tradeEntry.update({
        where: { id: matched.get(t.importKey)!.row.id },
        data: {
          importKey: t.importKey,
          buyFills: t.buyFills.length ? t.buyFills : Prisma.DbNull,
          sellFills: t.sellFills.length ? t.sellFills : Prisma.DbNull,
          ...positionFields(t),
        },
      }),
    ),
  ]);

  return {
    created: created.count,
    updated: toUpdate.length,
    unchanged: built.length - toCreate.length - toUpdate.length,
  };
}
