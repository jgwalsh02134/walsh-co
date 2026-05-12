-- AlterTable
ALTER TABLE "DriveDocument"
  ADD COLUMN "aiReviewStatus" TEXT,
  ADD COLUMN "aiReviewJson" JSONB,
  ADD COLUMN "aiReviewProvider" TEXT,
  ADD COLUMN "aiReviewedAt" TIMESTAMP(3),
  ADD COLUMN "aiReviewError" TEXT;
