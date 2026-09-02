-- AlterTable
ALTER TABLE "runs" ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedBy" TEXT;

-- AlterTable
ALTER TABLE "scenario_results" ADD COLUMN     "criteria" TEXT,
ADD COLUMN     "desc" TEXT,
ADD COLUMN     "flow" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "steps" TEXT;

-- CreateTable
CREATE TABLE "run_lock_events" (
    "id" TEXT NOT NULL,
    "runPartitionKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "byEmail" TEXT NOT NULL,
    "reason" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_lock_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "run_lock_events_runPartitionKey_idx" ON "run_lock_events"("runPartitionKey");
