-- CreateEnum
CREATE TYPE "public"."OptionType" AS ENUM ('CALL', 'PUT');

-- CreateEnum
CREATE TYPE "public"."LegAction" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "public"."TradeStatus" AS ENUM ('OPEN', 'CLOSED', 'ROLLED', 'PARTIAL');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TradeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "strategy" TEXT,
    "positionType" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "maxRisk" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TradeLeg" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "type" "public"."OptionType" NOT NULL,
    "action" "public"."LegAction" NOT NULL,
    "strike" DOUBLE PRECISION NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TradeLeg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."TradeEntry" ADD CONSTRAINT "TradeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TradeLeg" ADD CONSTRAINT "TradeLeg_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "public"."TradeEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
