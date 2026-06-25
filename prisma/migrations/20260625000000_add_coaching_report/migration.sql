-- CreateTable
CREATE TABLE "public"."CoachingReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachingReport_userId_date_key" ON "public"."CoachingReport"("userId", "date");

-- AddForeignKey
ALTER TABLE "public"."CoachingReport" ADD CONSTRAINT "CoachingReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
