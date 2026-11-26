-- Idempotent so it can be applied by hand in the Supabase SQL editor and
-- later re-run by `prisma migrate deploy` without failing.

-- AlterTable
ALTER TABLE "public"."TradeEntry" ADD COLUMN IF NOT EXISTS "importKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TradeEntry_userId_importKey_key" ON "public"."TradeEntry"("userId", "importKey");
