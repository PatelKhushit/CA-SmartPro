-- Generalize AiPendingAction.resultTaskId (task-only) into resultEntityType +
-- resultEntityId, since write tools can now produce leave requests and
-- document requests too, not just tasks. Backfill existing rows so no
-- historical audit data is lost.

ALTER TABLE "ai_pending_actions" ADD COLUMN "resultEntityType" TEXT;
ALTER TABLE "ai_pending_actions" ADD COLUMN "resultEntityId" TEXT;

UPDATE "ai_pending_actions"
SET "resultEntityType" = 'task', "resultEntityId" = "resultTaskId"
WHERE "resultTaskId" IS NOT NULL;

ALTER TABLE "ai_pending_actions" DROP COLUMN "resultTaskId";
