-- AlterTable
ALTER TABLE "runs" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "id_sequences" (
    "scope" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "id_sequences_pkey" PRIMARY KEY ("scope")
);
