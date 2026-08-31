import { randomUUID } from "crypto";
import {
  getRun,
  listRunsForSite,
  listScenarioResults,
  upsertRun,
  upsertScenarioResult,
} from "@/lib/azure/tables";
import { deleteEvidenceBlob, uploadEvidenceBlob } from "@/lib/azure/blob";
import { getSuite } from "@/lib/azure/test-suites-table";
import { listTags } from "@/lib/azure/tags-table";
import { getScenariosForSite } from "@/lib/scenarios";
import {
  computeGateResult,
  makeRunPartitionKey,
  sanitizeScenarioId,
  EVIDENCE_ALLOWED_CONTENT_TYPES,
  EVIDENCE_MAX_FILE_SIZE_BYTES,
  EVIDENCE_MAX_PER_SCENARIO,
  type EvidenceItem,
  type RunEntity,
  type ScenarioDef,
  type ScenarioResultEntity,
  type ScenarioStatus,
} from "@/lib/types";

export interface ScenarioWithResult extends ScenarioDef {
  status: ScenarioStatus;
  notes: string;
  evidence: EvidenceItem[];
}

function parseEvidence(json: string | undefined): EvidenceItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Narrows a site's full scenario list down to the ones a specific Run
 * actually covers. A Run created without a Suite has no `scenarioIdsJson`
 * and covers every scenario configured for the site — today's original,
 * unchanged behavior. A Suite-scoped Run snapshots its scenario ids at
 * creation time (see createRun()), so this must be used everywhere a run's
 * scenario list or gate result is computed — both getRunDetail() (what the
 * Scenario Board displays) and updateScenarioResult()'s aggregate/gate
 * recompute. Missing the latter would mean a scoped run's gate could never
 * reach READY, since out-of-scope scenarios would count as notrun forever.
 */
function scopeScenarios(siteScenarios: ScenarioDef[], run: RunEntity): ScenarioDef[] {
  if (!run.scenarioIdsJson) return siteScenarios;
  let ids: Set<string>;
  try {
    const parsed = JSON.parse(run.scenarioIdsJson);
    ids = new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return siteScenarios;
  }
  return siteScenarios.filter((s) => ids.has(s.id));
}

/** Shared by GET /api/runs/[site]/[runId] and the run detail page's server-side fetch. */
export async function getRunDetail(
  siteKey: string,
  runId: string
): Promise<{ run: RunEntity; scenarios: ScenarioWithResult[] } | undefined> {
  const siteFile = await getScenariosForSite(siteKey);
  if (!siteFile) return undefined;

  const [run, results] = await Promise.all([
    getRun(siteKey, runId),
    listScenarioResults(makeRunPartitionKey(siteKey, runId)),
  ]);
  if (!run) return undefined;

  const resultsByScenarioId = new Map(results.map((r) => [r.scenarioId, r]));
  const scenarios: ScenarioWithResult[] = scopeScenarios(siteFile.scenarios, run).map((def) => {
    const result = resultsByScenarioId.get(def.id);
    return {
      ...def,
      status: result?.status ?? "notrun",
      notes: result?.notes ?? "",
      evidence: parseEvidence(result?.evidenceJson),
    };
  });

  return { run, scenarios };
}

export interface CreateRunInput {
  siteKey: string;
  runId: string;
  environment: string;
  testCycle: string;
  executedDate: string;
  tester: string;
  version: string;
  deliveryBatch: string;
  hn?: string;
  vn?: string;
  an?: string;
  bill?: string;
  /** Optional — scope this Run to the union of these Suites' scenarios instead of every scenario
   *  configured for the site. Real QA practice has no fixed Run-to-Suite cardinality (a Run can
   *  cover 1 to many Suites depending on its objective/time budget), so this is a list, not a
   *  single id. */
  suiteIds?: string[];
  /** Optional tag filter (@smoke/@p1/@regression-style QA tag convention) — combines with
   *  suiteIds above via AND (Suite ∩ Tag) when both are given. tagIncludeIds match by "OR" (any
   *  selected tag) unless tagIncludeMode is "AND" (must have every selected tag). tagExcludeIds
   *  always drop a scenario that has *any* excluded tag (NOT). */
  tagIncludeIds?: string[];
  tagIncludeMode?: "AND" | "OR";
  tagExcludeIds?: string[];
}

export class CreateRunError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Shared by the POST /api/runs route handler and the "new run" Server Action. */
export async function createRun(input: CreateRunInput): Promise<RunEntity> {
  if (!input.siteKey || !input.runId) {
    throw new CreateRunError("siteKey and runId are required", 400);
  }

  const siteFile = await getScenariosForSite(input.siteKey);
  if (!siteFile) {
    throw new CreateRunError(`Unknown siteKey: ${input.siteKey}`, 400);
  }

  const existing = await listRunsForSite(input.siteKey);
  if (existing.some((r) => r.rowKey === input.runId)) {
    throw new CreateRunError(
      `Run ID "${input.runId}" already exists for site ${input.siteKey}`,
      409
    );
  }

  // Suite scoping: union every selected Suite's scenario ids together (a
  // scenario can legitimately be in more than one selected Suite — dedupe
  // via Set), then intersect with what's actually cloned to this site — a
  // suite scenario the site never cloned from Master simply isn't included,
  // not an error. Snapshot the resulting id list onto the Run itself
  // (scopeScenarios() reads it back later) so editing a Suite's membership
  // afterward never retroactively changes this Run's scope.
  let scopedScenarios = siteFile.scenarios;
  let suiteIdsJson: string | undefined;
  let suiteNamesJson: string | undefined;
  if (input.suiteIds && input.suiteIds.length > 0) {
    const suites = await Promise.all(input.suiteIds.map((id) => getSuite(id)));
    const missingIndex = suites.findIndex((s) => !s);
    if (missingIndex !== -1) {
      throw new CreateRunError(`Unknown suiteId: ${input.suiteIds[missingIndex]}`, 400);
    }
    const unionIdSet = new Set(suites.flatMap((s) => s!.scenarioIds));
    scopedScenarios = siteFile.scenarios.filter((s) => unionIdSet.has(s.id));
    if (scopedScenarios.length === 0) {
      throw new CreateRunError(
        "The selected Suite has no Scenario cloned to this site yet — clone from Master first",
        400
      );
    }
    suiteIdsJson = JSON.stringify(suites.map((s) => s!.id));
    suiteNamesJson = JSON.stringify(suites.map((s) => s!.name));
  }

  // Tag filter — applied on top of (intersected with) whatever the Suite
  // scoping above already narrowed down to, per the confirmed Suite ∩ Tag
  // combination rule. Include matches by OR (any selected tag) unless
  // tagIncludeMode is "AND" (must have every selected tag); Exclude always
  // drops a scenario that has *any* excluded tag.
  let tagIncludeIdsJson: string | undefined;
  let tagIncludeNamesJson: string | undefined;
  let tagIncludeMode: "AND" | "OR" | undefined;
  let tagExcludeIdsJson: string | undefined;
  let tagExcludeNamesJson: string | undefined;
  if ((input.tagIncludeIds && input.tagIncludeIds.length > 0) || (input.tagExcludeIds && input.tagExcludeIds.length > 0)) {
    const allTags = await listTags();
    const nameOf = (id: string) => allTags.find((t) => t.id === id)?.name ?? id;
    const includeSet = new Set(input.tagIncludeIds ?? []);
    const excludeSet = new Set(input.tagExcludeIds ?? []);
    const mode = input.tagIncludeMode ?? "OR";
    scopedScenarios = scopedScenarios.filter((s) => {
      const tags = new Set(s.tags ?? []);
      if ([...excludeSet].some((t) => tags.has(t))) return false;
      if (includeSet.size === 0) return true;
      return mode === "AND"
        ? [...includeSet].every((t) => tags.has(t))
        : [...includeSet].some((t) => tags.has(t));
    });
    if (scopedScenarios.length === 0) {
      throw new CreateRunError(
        "The Tag filter (combined with the Suite filter, if selected) doesn't match any Scenario in this site",
        400
      );
    }
    if (input.tagIncludeIds && input.tagIncludeIds.length > 0) {
      tagIncludeIdsJson = JSON.stringify(input.tagIncludeIds);
      tagIncludeNamesJson = JSON.stringify(input.tagIncludeIds.map(nameOf));
      tagIncludeMode = mode;
    }
    if (input.tagExcludeIds && input.tagExcludeIds.length > 0) {
      tagExcludeIdsJson = JSON.stringify(input.tagExcludeIds);
      tagExcludeNamesJson = JSON.stringify(input.tagExcludeIds.map(nameOf));
    }
  }

  // Snapshot the final scope once, from whichever filter(s) narrowed it —
  // not just inside the Suite branch above, or a tag-only filter (no Suite
  // selected) would silently fail to persist its scope at all.
  const scenarioIdsJson =
    suiteIdsJson || tagIncludeIdsJson || tagExcludeIdsJson
      ? JSON.stringify(scopedScenarios.map((s) => s.id))
      : undefined;

  const total = scopedScenarios.length;

  const run: RunEntity = {
    partitionKey: input.siteKey,
    rowKey: input.runId,
    siteName: siteFile.siteName,
    environment: input.environment || "STAGING",
    testCycle: input.testCycle || "Cycle 1",
    executedDate: input.executedDate || new Date().toISOString().slice(0, 10),
    tester: input.tester || "",
    version: input.version || "",
    deliveryBatch: input.deliveryBatch || "",
    hn: input.hn || "",
    vn: input.vn || "",
    an: input.an || "",
    bill: input.bill || "",
    totalScenarios: total,
    passed: 0,
    failed: 0,
    blocked: 0,
    notrun: total,
    passRatePercent: 0,
    criticalPass: false,
    gateResult: "NOT READY",
    savedAt: new Date().toISOString(),
    ...(suiteIdsJson && { suiteIdsJson, suiteNamesJson }),
    ...(tagIncludeIdsJson && { tagIncludeIdsJson, tagIncludeNamesJson, tagIncludeMode }),
    ...(tagExcludeIdsJson && { tagExcludeIdsJson, tagExcludeNamesJson }),
    ...(scenarioIdsJson && { scenarioIdsJson }),
  };

  await upsertRun(run);
  return run;
}

export interface UpdateRunMetadataInput {
  environment?: string;
  testCycle?: string;
  executedDate?: string;
  version?: string;
  deliveryBatch?: string;
  hn?: string;
  vn?: string;
  an?: string;
  bill?: string;
}

/**
 * Updates a Run's own metadata fields (Environment/Cycle/Date/Version/Delivery
 * Batch/Data Chain) — restricted to admin/qa_lead at the call site
 * (requireRole(CAN_EDIT_CONTENT) in the edit page/Server Action, not here).
 * Deliberately does NOT accept `tester` (locked to whoever created the run,
 * never editable afterward — see the New Run form) or touch Run
 * ID/Site/aggregate result fields (passed/failed/.../gateResult), which stay
 * owned by updateScenarioResult's recompute.
 */
export async function updateRunMetadata(
  siteKey: string,
  runId: string,
  input: UpdateRunMetadataInput
): Promise<RunEntity> {
  const run = await getRun(siteKey, runId);
  if (!run) {
    throw new CreateRunError("Run not found", 404);
  }

  const updated: RunEntity = {
    ...run,
    environment: input.environment ?? run.environment,
    testCycle: input.testCycle ?? run.testCycle,
    executedDate: input.executedDate ?? run.executedDate,
    version: input.version ?? run.version,
    deliveryBatch: input.deliveryBatch ?? run.deliveryBatch,
    hn: input.hn ?? run.hn,
    vn: input.vn ?? run.vn,
    an: input.an ?? run.an,
    bill: input.bill ?? run.bill,
  };
  await upsertRun(updated);
  return updated;
}

/** Suggests the next run number for a site, e.g. "NUH-RUN-004". */
export async function suggestNextRunId(siteKey: string): Promise<string> {
  const existing = await listRunsForSite(siteKey);
  const nums = existing
    .map((r) => /-RUN-(\d+)$/.exec(r.rowKey)?.[1])
    .filter((n): n is string => !!n)
    .map(Number);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${siteKey}-RUN-${String(next).padStart(3, "0")}`;
}

export interface UpdateScenarioInput {
  status?: ScenarioStatus;
  notes?: string;
}

/**
 * Updates one scenario's status/notes, then recomputes and persists the
 * parent Run's aggregate metrics + Gate result in the same call — this is
 * the server-side equivalent of the old localStorage app's
 * updateMetrics()/setStatus().
 */
export async function updateScenarioResult(
  siteKey: string,
  runId: string,
  scenarioId: string,
  input: UpdateScenarioInput
): Promise<{ scenarioResult: ScenarioResultEntity; run: RunEntity }> {
  const siteFile = await getScenariosForSite(siteKey);
  if (!siteFile) {
    throw new CreateRunError(`Unknown site: ${siteKey}`, 400);
  }
  const scenarioDef = siteFile.scenarios.find((s) => s.id === scenarioId);
  if (!scenarioDef) {
    throw new CreateRunError(`Unknown scenario: ${scenarioId}`, 400);
  }

  const run = await getRun(siteKey, runId);
  if (!run) {
    throw new CreateRunError("Run not found", 404);
  }

  const partitionKey = makeRunPartitionKey(siteKey, runId);
  const existingResults = await listScenarioResults(partitionKey);
  const resultsByScenarioId = new Map(existingResults.map((r) => [r.scenarioId, r]));

  const previous = resultsByScenarioId.get(scenarioId);
  const updated: ScenarioResultEntity = {
    partitionKey,
    rowKey: sanitizeScenarioId(scenarioId),
    scenarioId,
    status: input.status ?? previous?.status ?? "notrun",
    notes: input.notes ?? previous?.notes ?? "",
    critical: scenarioDef.critical,
  };
  await upsertScenarioResult(updated);
  resultsByScenarioId.set(scenarioId, updated);

  // Recompute aggregate metrics + gate across only this run's scoped
  // scenarios (scopeScenarios() — a Suite-scoped run must not count
  // out-of-scope scenarios as "notrun" forever, or its gate could never
  // reach READY).
  const runScenarios = scopeScenarios(siteFile.scenarios, run);
  const resultsRecord = Object.fromEntries(resultsByScenarioId);
  let passed = 0,
    failed = 0,
    blocked = 0,
    notrun = 0;
  for (const def of runScenarios) {
    const status = resultsRecord[def.id]?.status ?? "notrun";
    if (status === "passed") passed++;
    else if (status === "failed") failed++;
    else if (status === "blocked") blocked++;
    else notrun++;
  }
  const total = runScenarios.length;
  const { criticalPass, gateResult } = computeGateResult({
    scenarios: runScenarios,
    results: resultsRecord,
  });

  const updatedRun: RunEntity = {
    ...run,
    passed,
    failed,
    blocked,
    notrun,
    totalScenarios: total,
    passRatePercent: total > 0 ? Math.round((passed / total) * 100) : 0,
    criticalPass,
    gateResult,
    savedAt: new Date().toISOString(),
  };
  await upsertRun(updatedRun);

  return { scenarioResult: updated, run: updatedRun };
}

const EVIDENCE_EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Loads the current scenario result row (if any) for building an evidence-only update. */
async function findScenarioResult(
  partitionKey: string,
  scenarioId: string
): Promise<ScenarioResultEntity | undefined> {
  const existingResults = await listScenarioResults(partitionKey);
  return existingResults.find((r) => r.scenarioId === scenarioId);
}

/**
 * Uploads one evidence screenshot for a scenario and appends it to that
 * scenario result's evidence list. Does not touch status/notes (Merge upsert
 * preserves whatever is already stored) or the parent Run's aggregate
 * metrics — evidence isn't part of the Pass/Fail/Block/NotRun gate.
 */
export async function addEvidence(
  siteKey: string,
  runId: string,
  scenarioId: string,
  file: { buffer: Buffer; contentType: string }
): Promise<{ evidence: EvidenceItem[] }> {
  if (!EVIDENCE_ALLOWED_CONTENT_TYPES.includes(file.contentType)) {
    throw new CreateRunError("Only image files are supported (PNG, JPEG, WEBP, GIF)", 400);
  }
  if (file.buffer.length > EVIDENCE_MAX_FILE_SIZE_BYTES) {
    throw new CreateRunError("File too large (max 5MB per image)", 400);
  }

  const siteFile = await getScenariosForSite(siteKey);
  if (!siteFile) throw new CreateRunError(`Unknown site: ${siteKey}`, 400);
  const scenarioDef = siteFile.scenarios.find((s) => s.id === scenarioId);
  if (!scenarioDef) throw new CreateRunError(`Unknown scenario: ${scenarioId}`, 400);

  const run = await getRun(siteKey, runId);
  if (!run) throw new CreateRunError("Run not found", 404);

  const partitionKey = makeRunPartitionKey(siteKey, runId);
  const previous = await findScenarioResult(partitionKey, scenarioId);
  const evidence = parseEvidence(previous?.evidenceJson);

  if (evidence.length >= EVIDENCE_MAX_PER_SCENARIO) {
    throw new CreateRunError(`You can attach up to ${EVIDENCE_MAX_PER_SCENARIO} images per Scenario`, 400);
  }

  const evidenceId = randomUUID();
  const ext = EVIDENCE_EXT_BY_CONTENT_TYPE[file.contentType] ?? "bin";
  const blobName = `${siteKey}/${runId}/${sanitizeScenarioId(scenarioId)}/${evidenceId}.${ext}`;
  await uploadEvidenceBlob(blobName, file.buffer, file.contentType);

  const item: EvidenceItem = { id: evidenceId, blobName, uploadedAt: new Date().toISOString() };
  const updatedEvidence = [...evidence, item];

  await upsertScenarioResult({
    partitionKey,
    rowKey: sanitizeScenarioId(scenarioId),
    scenarioId,
    status: previous?.status ?? "notrun",
    notes: previous?.notes ?? "",
    critical: scenarioDef.critical,
    evidenceJson: JSON.stringify(updatedEvidence),
  });

  return { evidence: updatedEvidence };
}

/** Removes one evidence screenshot (both the Table Storage reference and the Blob itself). */
export async function removeEvidence(
  siteKey: string,
  runId: string,
  scenarioId: string,
  evidenceId: string
): Promise<{ evidence: EvidenceItem[] }> {
  const siteFile = await getScenariosForSite(siteKey);
  if (!siteFile) throw new CreateRunError(`Unknown site: ${siteKey}`, 400);
  const scenarioDef = siteFile.scenarios.find((s) => s.id === scenarioId);
  if (!scenarioDef) throw new CreateRunError(`Unknown scenario: ${scenarioId}`, 400);

  const partitionKey = makeRunPartitionKey(siteKey, runId);
  const previous = await findScenarioResult(partitionKey, scenarioId);
  const evidence = parseEvidence(previous?.evidenceJson);

  const target = evidence.find((e) => e.id === evidenceId);
  if (!target) {
    throw new CreateRunError("Evidence not found", 404);
  }

  await deleteEvidenceBlob(target.blobName);
  const updatedEvidence = evidence.filter((e) => e.id !== evidenceId);

  await upsertScenarioResult({
    partitionKey,
    rowKey: sanitizeScenarioId(scenarioId),
    scenarioId,
    status: previous?.status ?? "notrun",
    notes: previous?.notes ?? "",
    critical: scenarioDef.critical,
    evidenceJson: JSON.stringify(updatedEvidence),
  });

  return { evidence: updatedEvidence };
}
