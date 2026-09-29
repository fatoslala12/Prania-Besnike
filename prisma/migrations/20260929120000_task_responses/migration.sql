-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'RESPONSE_ADDED';
ALTER TYPE "EventType" ADD VALUE 'EMAIL_SENT';

-- CreateTable
CREATE TABLE "TaskResponse" (
    "id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "orgUnit" TEXT NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "authorName" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sentTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "TaskResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskResponse_taskId_seq_key" ON "TaskResponse"("taskId", "seq");

-- AddForeignKey
ALTER TABLE "TaskResponse" ADD CONSTRAINT "TaskResponse_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskResponse" ADD CONSTRAINT "TaskResponse_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
