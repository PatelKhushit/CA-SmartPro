-- CreateEnum
CREATE TYPE "AiMessageSource" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'DRAFTING', 'WAITING_FOR_CLIENT', 'READY_TO_SUBMIT', 'SUBMITTED', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "UDINDocumentType" AS ENUM ('CERTIFICATE', 'AUDIT_REPORT', 'GST_AUDIT', 'INCOME_TAX_AUDIT', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "UDINStatus" AS ENUM ('PENDING', 'GENERATED', 'VERIFIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ComplianceWorkStatus" AS ENUM ('UPCOMING', 'DUE_TODAY', 'SUBMITTED', 'COMPLETED', 'OVERDUE', 'WAITING_FOR_CLIENT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "GstReturnType" AS ENUM ('GSTR1', 'GSTR3B', 'GSTR9', 'GSTR9C', 'CMP08', 'OTHER');

-- CreateEnum
CREATE TYPE "TdsReturnType" AS ENUM ('FORM_24Q', 'FORM_26Q', 'FORM_27Q', 'FORM_27EQ');

-- CreateEnum
CREATE TYPE "TdsChallanStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "TdsCertificateType" AS ENUM ('FORM_16', 'FORM_16A', 'FORM_27D');

-- CreateEnum
CREATE TYPE "TdsCertificateStatus" AS ENUM ('PENDING', 'ISSUED');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('TASK_OVERDUE', 'COMPLIANCE_DUE_SOON', 'DOCUMENT_REQUEST_OVERDUE');

-- CreateEnum
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED', 'WAITING', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReminderEntityType" ADD VALUE 'NOTICE';
ALTER TYPE "ReminderEntityType" ADD VALUE 'GST_RETURN';
ALTER TYPE "ReminderEntityType" ADD VALUE 'TDS_RETURN';

-- AlterTable
ALTER TABLE "ai_messages" ADD COLUMN     "source" "AiMessageSource" NOT NULL DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "noticeId" TEXT;

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "department" "ServiceCategory" NOT NULL DEFAULT 'OTHER',
    "noticeType" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "noticeDate" TIMESTAMP(3) NOT NULL,
    "responseDeadline" TIMESTAMP(3),
    "assignedUserId" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "NoticeStatus" NOT NULL DEFAULT 'NEW',
    "description" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_comments" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_documents" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "udin_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentType" "UDINDocumentType" NOT NULL DEFAULT 'OTHER',
    "documentDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "udinNumber" TEXT,
    "generatedDate" TIMESTAMP(3),
    "status" "UDINStatus" NOT NULL DEFAULT 'PENDING',
    "assignedUserId" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "udin_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_profiles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "tradeName" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_returns" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "gstProfileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "returnType" "GstReturnType" NOT NULL,
    "taxPeriod" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ComplianceWorkStatus" NOT NULL DEFAULT 'UPCOMING',
    "assignedUserId" TEXT,
    "taskId" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "gst_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tds_profiles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tan" TEXT NOT NULL,
    "deductorType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tds_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tds_returns" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tdsProfileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "returnType" "TdsReturnType" NOT NULL,
    "quarter" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ComplianceWorkStatus" NOT NULL DEFAULT 'UPCOMING',
    "assignedUserId" TEXT,
    "taskId" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tds_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tds_challans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tdsProfileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "section" TEXT,
    "status" "TdsChallanStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tds_challans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tds_certificates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tdsProfileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "certificateType" "TdsCertificateType" NOT NULL,
    "quarter" TEXT NOT NULL,
    "status" "TdsCertificateStatus" NOT NULL DEFAULT 'PENDING',
    "issuedDate" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tds_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "triggerConfig" JSONB NOT NULL DEFAULT '{}',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationRuleId" TEXT NOT NULL,
    "triggerEntityType" TEXT NOT NULL,
    "triggerEntityId" TEXT NOT NULL,
    "clientId" TEXT,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'WAITING',
    "actionsSummary" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notices_organizationId_clientId_status_idx" ON "notices"("organizationId", "clientId", "status");

-- CreateIndex
CREATE INDEX "notices_organizationId_status_responseDeadline_idx" ON "notices"("organizationId", "status", "responseDeadline");

-- CreateIndex
CREATE INDEX "notice_comments_noticeId_idx" ON "notice_comments"("noticeId");

-- CreateIndex
CREATE INDEX "notice_documents_organizationId_idx" ON "notice_documents"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "notice_documents_noticeId_documentId_key" ON "notice_documents"("noticeId", "documentId");

-- CreateIndex
CREATE INDEX "udin_records_organizationId_clientId_status_idx" ON "udin_records"("organizationId", "clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "udin_records_organizationId_udinNumber_key" ON "udin_records"("organizationId", "udinNumber");

-- CreateIndex
CREATE INDEX "gst_profiles_organizationId_clientId_idx" ON "gst_profiles"("organizationId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "gst_profiles_organizationId_gstin_key" ON "gst_profiles"("organizationId", "gstin");

-- CreateIndex
CREATE UNIQUE INDEX "gst_returns_taskId_key" ON "gst_returns"("taskId");

-- CreateIndex
CREATE INDEX "gst_returns_organizationId_clientId_status_idx" ON "gst_returns"("organizationId", "clientId", "status");

-- CreateIndex
CREATE INDEX "gst_returns_organizationId_dueDate_status_idx" ON "gst_returns"("organizationId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "gst_returns_organizationId_gstProfileId_returnType_taxPerio_key" ON "gst_returns"("organizationId", "gstProfileId", "returnType", "taxPeriod");

-- CreateIndex
CREATE INDEX "tds_profiles_organizationId_clientId_idx" ON "tds_profiles"("organizationId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "tds_profiles_organizationId_tan_key" ON "tds_profiles"("organizationId", "tan");

-- CreateIndex
CREATE UNIQUE INDEX "tds_returns_taskId_key" ON "tds_returns"("taskId");

-- CreateIndex
CREATE INDEX "tds_returns_organizationId_clientId_status_idx" ON "tds_returns"("organizationId", "clientId", "status");

-- CreateIndex
CREATE INDEX "tds_returns_organizationId_dueDate_status_idx" ON "tds_returns"("organizationId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tds_returns_organizationId_tdsProfileId_returnType_quarter_key" ON "tds_returns"("organizationId", "tdsProfileId", "returnType", "quarter");

-- CreateIndex
CREATE INDEX "tds_challans_organizationId_clientId_status_idx" ON "tds_challans"("organizationId", "clientId", "status");

-- CreateIndex
CREATE INDEX "tds_certificates_organizationId_clientId_status_idx" ON "tds_certificates"("organizationId", "clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tds_certificates_organizationId_tdsProfileId_certificateTyp_key" ON "tds_certificates"("organizationId", "tdsProfileId", "certificateType", "quarter");

-- CreateIndex
CREATE INDEX "automation_rules_organizationId_isEnabled_triggerType_idx" ON "automation_rules"("organizationId", "isEnabled", "triggerType");

-- CreateIndex
CREATE INDEX "automation_executions_organizationId_status_idx" ON "automation_executions"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "automation_executions_automationRuleId_triggerEntityType_tr_key" ON "automation_executions"("automationRuleId", "triggerEntityType", "triggerEntityId");

-- CreateIndex
CREATE INDEX "tasks_organizationId_noticeId_idx" ON "tasks"("organizationId", "noticeId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_comments" ADD CONSTRAINT "notice_comments_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_comments" ADD CONSTRAINT "notice_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_documents" ADD CONSTRAINT "notice_documents_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_documents" ADD CONSTRAINT "notice_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "udin_records" ADD CONSTRAINT "udin_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "udin_records" ADD CONSTRAINT "udin_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "udin_records" ADD CONSTRAINT "udin_records_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "udin_records" ADD CONSTRAINT "udin_records_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_profiles" ADD CONSTRAINT "gst_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_profiles" ADD CONSTRAINT "gst_profiles_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_gstProfileId_fkey" FOREIGN KEY ("gstProfileId") REFERENCES "gst_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_returns" ADD CONSTRAINT "gst_returns_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_profiles" ADD CONSTRAINT "tds_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_profiles" ADD CONSTRAINT "tds_profiles_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_returns" ADD CONSTRAINT "tds_returns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_returns" ADD CONSTRAINT "tds_returns_tdsProfileId_fkey" FOREIGN KEY ("tdsProfileId") REFERENCES "tds_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_returns" ADD CONSTRAINT "tds_returns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_returns" ADD CONSTRAINT "tds_returns_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_returns" ADD CONSTRAINT "tds_returns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_returns" ADD CONSTRAINT "tds_returns_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_challans" ADD CONSTRAINT "tds_challans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_challans" ADD CONSTRAINT "tds_challans_tdsProfileId_fkey" FOREIGN KEY ("tdsProfileId") REFERENCES "tds_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_challans" ADD CONSTRAINT "tds_challans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_challans" ADD CONSTRAINT "tds_challans_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_certificates" ADD CONSTRAINT "tds_certificates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_certificates" ADD CONSTRAINT "tds_certificates_tdsProfileId_fkey" FOREIGN KEY ("tdsProfileId") REFERENCES "tds_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_certificates" ADD CONSTRAINT "tds_certificates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tds_certificates" ADD CONSTRAINT "tds_certificates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
