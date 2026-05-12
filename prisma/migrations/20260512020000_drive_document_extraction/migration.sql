-- AlterTable
ALTER TABLE "DriveDocument"
  ADD COLUMN "extractedJson" JSONB,
  ADD COLUMN "extractedText" TEXT,
  ADD COLUMN "extractedAt" TIMESTAMP(3),
  ADD COLUMN "extractionError" TEXT;
