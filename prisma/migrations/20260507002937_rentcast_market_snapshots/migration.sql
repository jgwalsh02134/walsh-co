-- CreateTable
CREATE TABLE "MarketSourceSnapshot" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyLabel" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "estimatedValue" DECIMAL(14,2),
    "estimatedRent" DECIMAL(10,2),
    "valueLow" DECIMAL(14,2),
    "valueHigh" DECIMAL(14,2),
    "rentLow" DECIMAL(10,2),
    "rentHigh" DECIMAL(10,2),
    "compsCount" INTEGER,
    "confidence" TEXT,
    "raw" JSONB,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asOfDate" TIMESTAMP(3),
    "isPrivateReference" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSourceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketSourceSnapshot_propertyId_idx" ON "MarketSourceSnapshot"("propertyId");

-- CreateIndex
CREATE INDEX "MarketSourceSnapshot_provider_idx" ON "MarketSourceSnapshot"("provider");

-- CreateIndex
CREATE INDEX "MarketSourceSnapshot_sourceType_idx" ON "MarketSourceSnapshot"("sourceType");

-- CreateIndex
CREATE INDEX "MarketSourceSnapshot_fetchedAt_idx" ON "MarketSourceSnapshot"("fetchedAt");
