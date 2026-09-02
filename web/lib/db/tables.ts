import type { RunEntity, RunLockEventEntity, ScenarioResultEntity } from "@/lib/types";
import { prisma } from "./client";

// Prisma-backed replacement for the old Table Storage "Runs" + "ScenarioResults" tables (see
// specs/REQ-029_postgres_migration.md at the repo root). Same exported function names/signatures as
// lib/azure/tables.ts, so lib/runs.ts needed zero logic changes — only its import path moved.

// ---------- Runs ----------

function parseJsonArray(json: string | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type RunRow = {
  siteKey: string;
  runId: string;
  siteName: string;
  name: string;
  environment: string;
  testCycle: string;
  executedDate: string;
  tester: string;
  version: string;
  deliveryBatch: string;
  hn: string;
  vn: string;
  an: string;
  bill: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  blocked: number;
  notrun: number;
  passRatePercent: number;
  criticalPass: boolean;
  gateResult: string;
  savedAt: Date;
  suiteIds: string[];
  suiteNames: string[];
  scenarioIds: string[];
  tagIncludeIds: string[];
  tagIncludeNames: string[];
  tagIncludeMode: string | null;
  tagExcludeIds: string[];
  tagExcludeNames: string[];
  locked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
};

function runRowToEntity(row: RunRow): RunEntity {
  const entity: RunEntity = {
    partitionKey: row.siteKey,
    rowKey: row.runId,
    siteName: row.siteName,
    name: row.name,
    environment: row.environment,
    testCycle: row.testCycle,
    executedDate: row.executedDate,
    tester: row.tester,
    version: row.version,
    deliveryBatch: row.deliveryBatch,
    hn: row.hn,
    vn: row.vn,
    an: row.an,
    bill: row.bill,
    totalScenarios: row.totalScenarios,
    passed: row.passed,
    failed: row.failed,
    blocked: row.blocked,
    notrun: row.notrun,
    passRatePercent: row.passRatePercent,
    criticalPass: row.criticalPass,
    gateResult: row.gateResult as RunEntity["gateResult"],
    savedAt: row.savedAt.toISOString(),
    locked: row.locked,
  };
  if (row.lockedAt) entity.lockedAt = row.lockedAt.toISOString();
  if (row.lockedBy) entity.lockedBy = row.lockedBy;
  // Empty array == "field was never set" == the same "absent means unscoped/unfiltered" tolerance
  // every reader (scopeScenarios() etc.) already has — createRun() never persists a Run with a
  // *_ids array that's non-empty-but-meaningless, so this round-trips correctly.
  if (row.suiteIds.length > 0) {
    entity.suiteIdsJson = JSON.stringify(row.suiteIds);
    entity.suiteNamesJson = JSON.stringify(row.suiteNames);
  }
  if (row.tagIncludeIds.length > 0) {
    entity.tagIncludeIdsJson = JSON.stringify(row.tagIncludeIds);
    entity.tagIncludeNamesJson = JSON.stringify(row.tagIncludeNames);
    if (row.tagIncludeMode) entity.tagIncludeMode = row.tagIncludeMode as "AND" | "OR";
  }
  if (row.tagExcludeIds.length > 0) {
    entity.tagExcludeIdsJson = JSON.stringify(row.tagExcludeIds);
    entity.tagExcludeNamesJson = JSON.stringify(row.tagExcludeNames);
  }
  if (row.scenarioIds.length > 0) {
    entity.scenarioIdsJson = JSON.stringify(row.scenarioIds);
  }
  return entity;
}

function runEntityToData(run: RunEntity) {
  return {
    siteName: run.siteName,
    name: run.name,
    environment: run.environment,
    testCycle: run.testCycle,
    executedDate: run.executedDate,
    tester: run.tester,
    version: run.version,
    deliveryBatch: run.deliveryBatch,
    hn: run.hn,
    vn: run.vn,
    an: run.an,
    bill: run.bill,
    totalScenarios: run.totalScenarios,
    passed: run.passed,
    failed: run.failed,
    blocked: run.blocked,
    notrun: run.notrun,
    passRatePercent: run.passRatePercent,
    criticalPass: run.criticalPass,
    gateResult: run.gateResult,
    savedAt: new Date(run.savedAt),
    suiteIds: parseJsonArray(run.suiteIdsJson),
    suiteNames: parseJsonArray(run.suiteNamesJson),
    scenarioIds: parseJsonArray(run.scenarioIdsJson),
    tagIncludeIds: parseJsonArray(run.tagIncludeIdsJson),
    tagIncludeNames: parseJsonArray(run.tagIncludeNamesJson),
    tagIncludeMode: run.tagIncludeMode ?? null,
    tagExcludeIds: parseJsonArray(run.tagExcludeIdsJson),
    tagExcludeNames: parseJsonArray(run.tagExcludeNamesJson),
    locked: run.locked,
    lockedAt: run.lockedAt ? new Date(run.lockedAt) : null,
    lockedBy: run.lockedBy ?? null,
  };
}

export async function upsertRun(run: RunEntity): Promise<void> {
  const data = runEntityToData(run);
  await prisma.run.upsert({
    where: { siteKey_runId: { siteKey: run.partitionKey, runId: run.rowKey } },
    create: { siteKey: run.partitionKey, runId: run.rowKey, ...data },
    update: data,
  });
}

export async function getRun(siteKey: string, runId: string): Promise<RunEntity | undefined> {
  const row = await prisma.run.findUnique({ where: { siteKey_runId: { siteKey, runId } } });
  return row ? runRowToEntity(row) : undefined;
}

export async function listRunsForSite(siteKey: string): Promise<RunEntity[]> {
  const rows = await prisma.run.findMany({ where: { siteKey } });
  const results = rows.map(runRowToEntity);
  // Newest first.
  results.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  return results;
}

// ---------- Scenario Results ----------

function parseEvidenceJson(evidence: unknown): string | undefined {
  // Stored as Postgres jsonb (already parsed), but the app-facing entity shape wants a JSON
  // *string* (evidenceJson) — same "stringify at the boundary" translation as everywhere else in
  // this file. Round-trips through JSON.stringify/parse to guarantee the exact string shape
  // lib/runs.ts's parseEvidence() already expects.
  if (evidence == null) return undefined;
  const arr = Array.isArray(evidence) ? evidence : [];
  return JSON.stringify(arr);
}

function resultRowToEntity(row: {
  runPartitionKey: string;
  scenarioRowKey: string;
  scenarioId: string;
  status: string;
  notes: string;
  critical: boolean;
  evidence: unknown;
  name: string | null;
  desc: string | null;
  role: string | null;
  flow: string | null;
  steps: string | null;
  criteria: string | null;
}): ScenarioResultEntity {
  const entity: ScenarioResultEntity = {
    partitionKey: row.runPartitionKey,
    rowKey: row.scenarioRowKey,
    scenarioId: row.scenarioId,
    status: row.status as ScenarioResultEntity["status"],
    notes: row.notes,
    critical: row.critical,
    evidenceJson: parseEvidenceJson(row.evidence),
  };
  // REQ-030 snapshot columns — null on rows written before this feature (no backfill); presence is
  // keyed off `name` throughout lib/runs.ts (resolveRunScenarios()) to decide snapshot vs. live-join.
  if (row.name != null) entity.name = row.name;
  if (row.desc != null) entity.desc = row.desc;
  if (row.role != null) entity.role = row.role;
  if (row.flow != null) entity.flow = row.flow;
  if (row.steps != null) entity.steps = row.steps;
  if (row.criteria != null) entity.criteria = row.criteria;
  return entity;
}

export async function upsertScenarioResult(entity: ScenarioResultEntity): Promise<void> {
  // "Merge" semantics like the old upsertEntity(entity, "Merge") — status/notes/evidence writers
  // in lib/runs.ts always pass the full row they intend to persist (reading the previous row
  // first when only touching one field), so a plain upsert already matches that behavior; there's
  // no partial-field caller here the way there is for Users/Sites' Merge updates.
  const evidence = entity.evidenceJson ? JSON.parse(entity.evidenceJson) : [];
  const data = {
    scenarioId: entity.scenarioId,
    status: entity.status,
    notes: entity.notes,
    critical: entity.critical,
    evidence,
    name: entity.name ?? null,
    desc: entity.desc ?? null,
    role: entity.role ?? null,
    flow: entity.flow ?? null,
    steps: entity.steps ?? null,
    criteria: entity.criteria ?? null,
  };
  await prisma.scenarioResult.upsert({
    where: {
      runPartitionKey_scenarioRowKey: {
        runPartitionKey: entity.partitionKey,
        scenarioRowKey: entity.rowKey,
      },
    },
    create: { runPartitionKey: entity.partitionKey, scenarioRowKey: entity.rowKey, ...data },
    update: data,
  });
}

export async function listScenarioResults(
  runPartitionKey: string
): Promise<ScenarioResultEntity[]> {
  const rows = await prisma.scenarioResult.findMany({ where: { runPartitionKey } });
  return rows.map(resultRowToEntity);
}

// ---------- Run Lock Events (REQ-031) ----------

function lockEventRowToEntity(row: {
  id: string;
  runPartitionKey: string;
  action: string;
  byEmail: string;
  reason: string | null;
  at: Date;
}): RunLockEventEntity {
  const entity: RunLockEventEntity = {
    id: row.id,
    runPartitionKey: row.runPartitionKey,
    action: row.action as RunLockEventEntity["action"],
    byEmail: row.byEmail,
    at: row.at.toISOString(),
  };
  if (row.reason != null) entity.reason = row.reason;
  return entity;
}

/** Appends one Lock/Unlock event — this table is write-once-per-row, never updated/merged, unlike
 *  every other upsert*() in this file (the whole point is preserving every past reason). */
export async function addRunLockEvent(
  runPartitionKey: string,
  action: "LOCK" | "UNLOCK",
  byEmail: string,
  reason?: string
): Promise<void> {
  await prisma.runLockEvent.create({
    data: { runPartitionKey, action, byEmail, reason: reason ?? null },
  });
}

/** Newest first, matching listRunsForSite()'s ordering convention. */
export async function listRunLockEvents(runPartitionKey: string): Promise<RunLockEventEntity[]> {
  const rows = await prisma.runLockEvent.findMany({
    where: { runPartitionKey },
    orderBy: { at: "desc" },
  });
  return rows.map(lockEventRowToEntity);
}
