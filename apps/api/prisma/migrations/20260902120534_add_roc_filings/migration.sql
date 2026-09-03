-- CreateEnum
CREATE TYPE "RocFormType" AS ENUM ('AOC_4', 'MGT_7', 'MGT_7A', 'ADT_1', 'DIR_3_KYC', 'DIR_12', 'DPT_3', 'INC_20A', 'PAS_3', 'LLP_FORM_8', 'LLP_FORM_11', 'OTHER');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "cinOrLlpin" TEXT;

-- CreateTable
CREATE TABLE "roc_filings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "formType" "RocFormType" NOT NULL,
    "financialYear" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "filingDate" TIMESTAMP(3),
    "srn" TEXT,
    "status" "ComplianceWorkStatus" NOT NULL DEFAULT 'UPCOMING',
    "assignedUserId" TEXT,
    "taskId" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "roc_filings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roc_filings_taskId_key" ON "roc_filings"("taskId");

-- CreateIndex
CREATE INDEX "roc_filings_organizationId_clientId_status_idx" ON "roc_filings"("organizationId", "clientId", "status");

-- CreateIndex
CREATE INDEX "roc_filings_organizationId_dueDate_status_idx" ON "roc_filings"("organizationId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "roc_filings_organizationId_clientId_formType_financialYear_key" ON "roc_filings"("organizationId", "clientId", "formType", "financialYear");

-- AddForeignKey
ALTER TABLE "roc_filings" ADD CONSTRAINT "roc_filings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roc_filings" ADD CONSTRAINT "roc_filings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roc_filings" ADD CONSTRAINT "roc_filings_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roc_filings" ADD CONSTRAINT "roc_filings_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roc_filings" ADD CONSTRAINT "roc_filings_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
