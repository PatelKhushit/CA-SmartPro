-- CreateEnum
CREATE TYPE "ItrFormType" AS ENUM ('ITR_1', 'ITR_2', 'ITR_3', 'ITR_4', 'ITR_5', 'ITR_6', 'ITR_7', 'OTHER');

-- CreateEnum
CREATE TYPE "ItrReturnStatus" AS ENUM ('DATA_COLLECTION', 'PREPARATION', 'REVIEW', 'CLIENT_APPROVAL', 'FILED', 'VERIFICATION', 'COMPLETED', 'DEMAND', 'REFUND');

-- CreateTable
CREATE TABLE "itr_returns" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assessmentYear" TEXT NOT NULL,
    "formType" "ItrFormType" NOT NULL,
    "status" "ItrReturnStatus" NOT NULL DEFAULT 'DATA_COLLECTION',
    "acknowledgementNumber" TEXT,
    "refundAmount" DECIMAL(14,2),
    "demandAmount" DECIMAL(14,2),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "filingDate" TIMESTAMP(3),
    "assignedUserId" TEXT,
    "reviewerUserId" TEXT,
    "taskId" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "itr_returns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "itr_returns_taskId_key" ON "itr_returns"("taskId");

-- CreateIndex
CREATE INDEX "itr_returns_organizationId_clientId_status_idx" ON "itr_returns"("organizationId", "clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "itr_returns_organizationId_clientId_assessmentYear_formType_key" ON "itr_returns"("organizationId", "clientId", "assessmentYear", "formType");

-- AddForeignKey
ALTER TABLE "itr_returns" ADD CONSTRAINT "itr_returns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itr_returns" ADD CONSTRAINT "itr_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itr_returns" ADD CONSTRAINT "itr_returns_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itr_returns" ADD CONSTRAINT "itr_returns_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itr_returns" ADD CONSTRAINT "itr_returns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itr_returns" ADD CONSTRAINT "itr_returns_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
