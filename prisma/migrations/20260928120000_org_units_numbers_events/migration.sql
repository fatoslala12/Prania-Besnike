-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CREATED', 'ASSIGNED', 'UNASSIGNED', 'STATUS_CHANGED', 'COMMENT_ADDED', 'DOCUMENT_UPLOADED', 'UPDATED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "orgUnit" TEXT;

-- AlterTable: ministry -> orgUnit, add number (backfilled before NOT NULL)
ALTER TABLE "Task" ADD COLUMN "orgUnit" TEXT;
ALTER TABLE "Task" ADD COLUMN "number" TEXT;

UPDATE "Task" SET "orgUnit" = "ministry";

UPDATE "Task" t
SET "number" = 'PB-' || EXTRACT(YEAR FROM t."createdAt")::int || '-' || LPAD(n.rn::text, 4, '0')
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "createdAt") ORDER BY "createdAt", "id") AS rn
  FROM "Task"
) n
WHERE t."id" = n."id";

ALTER TABLE "Task" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "Task" DROP COLUMN "ministry";

-- CreateTable
CREATE TABLE "TaskCounter" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "TaskCounter_pkey" PRIMARY KEY ("year")
);

INSERT INTO "TaskCounter" ("year", "value")
SELECT EXTRACT(YEAR FROM "createdAt")::int, COUNT(*)::int
FROM "Task"
GROUP BY 1;

-- CreateTable
CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "message" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT,

    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskEvent_taskId_createdAt_idx" ON "TaskEvent"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskEvent_createdAt_idx" ON "TaskEvent"("createdAt");

-- CreateIndex
CREATE INDEX "User_orgUnit_idx" ON "User"("orgUnit");

-- CreateIndex
CREATE UNIQUE INDEX "Task_number_key" ON "Task"("number");

-- CreateIndex
CREATE INDEX "Task_orgUnit_idx" ON "Task"("orgUnit");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

-- AddForeignKey
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
