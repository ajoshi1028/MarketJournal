-- CreateEnum
CREATE TYPE "public"."TradeOutcome" AS ENUM ('PROFIT', 'LOSS');

-- AlterTable
ALTER TABLE "public"."TradeEntry" ADD COLUMN     "outcome" "public"."TradeOutcome";
