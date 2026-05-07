-- CreateTable
CREATE TABLE "MarketManualEntry" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyLabel" TEXT NOT NULL,
    "estimatedValue" DECIMAL(14,2),
    "estimatedRent" DECIMAL(10,2),
    "assessedValue" DECIMAL(14,2),
    "annualTaxes" DECIMAL(12,2),
    "purchaseBasis" DECIMAL(14,2),
    "renovationBudget" DECIMAL(14,2),
    "targetRent" DECIMAL(10,2),
    "sourceName" TEXT DEFAULT 'Manual Internal',
    "sourceNote" TEXT,
    "asOfDate" TIMESTAMP(3),
    "confidence" TEXT,
    "isPrivateReference" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketManualEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketManualEntry_propertyId_key" ON "MarketManualEntry"("propertyId");

-- CreateIndex
CREATE INDEX "MarketManualEntry_propertyId_idx" ON "MarketManualEntry"("propertyId");
