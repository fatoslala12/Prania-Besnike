-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Notification_kind_createdAt_idx" ON "Notification"("kind", "createdAt");
