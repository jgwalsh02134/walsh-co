-- CreateTable
CREATE TABLE "DriveDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "linkedPropertySlug" TEXT,
    "driveFileId" TEXT NOT NULL,
    "driveWebUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "extractionStatus" TEXT NOT NULL DEFAULT 'not_started',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriveDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriveDocument_driveFileId_key" ON "DriveDocument"("driveFileId");

-- CreateIndex
CREATE INDEX "DriveDocument_linkedPropertySlug_idx" ON "DriveDocument"("linkedPropertySlug");

-- CreateIndex
CREATE INDEX "DriveDocument_category_idx" ON "DriveDocument"("category");

-- CreateIndex
CREATE INDEX "DriveDocument_uploadedAt_idx" ON "DriveDocument"("uploadedAt");
