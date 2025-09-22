-- AlterTable
ALTER TABLE "public"."Promotion" ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "expiresAt" TIMESTAMP(3);
