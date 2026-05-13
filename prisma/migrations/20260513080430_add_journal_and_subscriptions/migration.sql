/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."TradeEntry" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT DEFAULT 'free',
ADD COLUMN     "subscriptionStatus" TEXT DEFAULT 'free';

-- CreateTable
CREATE TABLE "public"."Journal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "premarketPlan" TEXT,
    "watchlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marketBias" TEXT,
    "keyLevels" TEXT,
    "postReview" TEXT,
    "lessonsLearned" TEXT,
    "mood" INTEGER,
    "confidence" INTEGER,
    "grade" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Journal_userId_date_key" ON "public"."Journal"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "public"."User"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "public"."Journal" ADD CONSTRAINT "Journal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
