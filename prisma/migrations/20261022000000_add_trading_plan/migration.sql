-- CreateTable
CREATE TABLE "public"."TradingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startingBalance" DOUBLE PRECISION NOT NULL,
    "startDate" DATE NOT NULL,
    "riskPct" DOUBLE PRECISION NOT NULL,
    "takeProfitPct" DOUBLE PRECISION NOT NULL,
    "stopLossPct" DOUBLE PRECISION NOT NULL,
    "targetWinRate" DOUBLE PRECISION NOT NULL,
    "maxTradesPerDay" INTEGER,
    "killWindow" INTEGER NOT NULL DEFAULT 20,
    "killFloor" DOUBLE PRECISION NOT NULL DEFAULT 45,
    "killRiskPct" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradingPlan_userId_key" ON "public"."TradingPlan"("userId");

-- AddForeignKey
ALTER TABLE "public"."TradingPlan" ADD CONSTRAINT "TradingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

