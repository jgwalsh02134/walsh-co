-- CreateEnum
CREATE TYPE "ContactCategory" AS ENUM ('CONTRACTORS_TRADES', 'LEGAL', 'INSURANCE', 'MUNICIPAL', 'UTILITIES', 'FINANCE_ACCOUNTING', 'REAL_ESTATE_LEASING', 'PROPERTY_MANAGEMENT', 'TENANTS_OCCUPANTS', 'SUPPLIERS', 'INSPECTORS_TESTING', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'PROSPECT', 'PREFERRED', 'BACKUP', 'NEEDS_FOLLOWUP', 'INACTIVE', 'DO_NOT_USE');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('UNKNOWN', 'MISSING', 'REQUESTED', 'CURRENT', 'EXPIRED', 'NOT_REQUIRED');

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "category" "ContactCategory" NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "relatedProperty" TEXT,
    "relatedProject" TEXT,
    "insuranceStatus" "ComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "licenseStatus" "ComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "w9Status" "ComplianceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastContactedAt" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_category_idx" ON "Contact"("category");

-- CreateIndex
CREATE INDEX "Contact_status_idx" ON "Contact"("status");

-- CreateIndex
CREATE INDEX "Contact_displayName_idx" ON "Contact"("displayName");

-- CreateIndex
CREATE INDEX "Contact_archivedAt_idx" ON "Contact"("archivedAt");
