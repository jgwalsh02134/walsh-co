-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('business', 'private');

-- CreateEnum
CREATE TYPE "AssetRole" AS ENUM ('Active_Rental', 'Active_Renovation_Project', 'Private_Reference_Only');

-- CreateTable
CREATE TABLE "TrackedProperty" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT,
    "zipNeedsVerification" BOOLEAN NOT NULL DEFAULT false,
    "factsNeedVerification" BOOLEAN NOT NULL DEFAULT false,
    "assetRole" "AssetRole" NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "workspaceHref" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedProperty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackedProperty_slug_key" ON "TrackedProperty"("slug");

-- CreateIndex
CREATE INDEX "TrackedProperty_slug_idx" ON "TrackedProperty"("slug");

-- CreateIndex
CREATE INDEX "TrackedProperty_kind_idx" ON "TrackedProperty"("kind");