-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "afterValue" JSONB,
ADD COLUMN     "beforeValue" JSONB,
ADD COLUMN     "userAgent" TEXT;
