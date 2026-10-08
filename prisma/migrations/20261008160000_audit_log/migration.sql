-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "login" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "role" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "details" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
