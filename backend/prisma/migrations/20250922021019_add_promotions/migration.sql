/*
  Warnings:

  - You are about to drop the column `promoApplied` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `Promotion` table. All the data in the column will be lost.
  - You are about to drop the column `conditions` on the `Promotion` table. All the data in the column will be lost.
  - You are about to drop the column `daysOfWeek` on the `Promotion` table. All the data in the column will be lost.
  - You are about to drop the column `key` on the `Promotion` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."PromoType" ADD VALUE 'CONDITION';

-- DropIndex
DROP INDEX "public"."Promotion_key_key";

-- AlterTable
ALTER TABLE "public"."Bill" DROP COLUMN "promoApplied",
ADD COLUMN     "promoId" TEXT;

-- AlterTable
ALTER TABLE "public"."Promotion" DROP COLUMN "active",
DROP COLUMN "conditions",
DROP COLUMN "daysOfWeek",
DROP COLUMN "key",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minAdults" INTEGER,
ADD COLUMN     "payAdults" INTEGER;

-- CreateIndex
CREATE INDEX "Bill_promoId_idx" ON "public"."Bill"("promoId");

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "public"."Promotion"("isActive");

-- CreateIndex
CREATE INDEX "Promotion_expiresAt_idx" ON "public"."Promotion"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."Bill" ADD CONSTRAINT "Bill_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "public"."Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
