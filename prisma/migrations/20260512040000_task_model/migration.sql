-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "propertySlug" TEXT,
    "category" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "sourceDocumentId" TEXT,
    "sourceDocumentName" TEXT,
    "sourceProposalIndex" INTEGER,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex
CREATE INDEX "Task_propertySlug_idx" ON "Task"("propertySlug");

-- CreateIndex
CREATE INDEX "Task_sourceDocumentId_idx" ON "Task"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");
