-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'qa_lead', 'qa_engineer');

-- CreateTable
CREATE TABLE "users" (
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "roles" "Role"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "siteKey" TEXT NOT NULL,
    "rowKey" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "flow" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "critical" BOOLEAN NOT NULL,
    "steps" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("siteKey","rowKey")
);

-- CreateTable
CREATE TABLE "suites" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scenarioIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "suites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "siteKey" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "testCycle" TEXT NOT NULL,
    "executedDate" TEXT NOT NULL,
    "tester" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "deliveryBatch" TEXT NOT NULL,
    "hn" TEXT NOT NULL,
    "vn" TEXT NOT NULL,
    "an" TEXT NOT NULL,
    "bill" TEXT NOT NULL,
    "totalScenarios" INTEGER NOT NULL,
    "passed" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "blocked" INTEGER NOT NULL,
    "notrun" INTEGER NOT NULL,
    "passRatePercent" INTEGER NOT NULL,
    "criticalPass" BOOLEAN NOT NULL,
    "gateResult" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL,
    "suiteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suiteNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scenarioIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagIncludeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagIncludeNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagIncludeMode" TEXT,
    "tagExcludeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tagExcludeNames" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "runs_pkey" PRIMARY KEY ("siteKey","runId")
);

-- CreateTable
CREATE TABLE "scenario_results" (
    "runPartitionKey" TEXT NOT NULL,
    "scenarioRowKey" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "critical" BOOLEAN NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "scenario_results_pkey" PRIMARY KEY ("runPartitionKey","scenarioRowKey")
);

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_siteKey_fkey" FOREIGN KEY ("siteKey") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
