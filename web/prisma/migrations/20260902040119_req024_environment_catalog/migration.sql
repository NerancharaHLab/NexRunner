-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);
