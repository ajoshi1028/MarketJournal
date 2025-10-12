-- AlterTable
ALTER TABLE "public"."TradeEntry" ADD COLUMN     "avgBuyPrice" DOUBLE PRECISION,
ADD COLUMN     "avgSellPrice" DOUBLE PRECISION,
ADD COLUMN     "buyFills" JSONB,
ADD COLUMN     "realizedPnl" DOUBLE PRECISION,
ADD COLUMN     "sellDate" TIMESTAMP(3),
ADD COLUMN     "sellFills" JSONB,
ADD COLUMN     "totalBuyQty" INTEGER,
ADD COLUMN     "totalSellQty" INTEGER;
