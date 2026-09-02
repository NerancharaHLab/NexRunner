import { randomUUID } from "crypto";
import {
  addRunLockEvent,
  getRun,
  listRunLockEvents,
  listScenarioResults,
  upsertRun,
  upsertScenarioResult,
} from "@/lib/db/tables";
import { deleteEvidenceBlob, uploadEvidenceBlob } from "@/lib/azure/blob";
import { getSuite } from "@/lib/db/test-suites-table";
import { getSite } from "@/lib/db/sites-table";
import { listTags } from "@/lib/db/tags-table";
import { nextRunId } from "@/lib/db/id-sequence";
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
  type RunLockEventEntity,
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

interface ResolvedRunScenario {
  id: string;
  critical: boolean;
  /** Present only when this id had to fall back to a live Scenario join (see below) — absent for
   *  the normal, protected (REQ-030 snapshot present) case. */
  def?: ScenarioDef;
}

/**
 * Determines exactly which scenarios a Run covers, preferring each scenario's own frozen
 * `ScenarioResult` snapshot (REQ-030) over the site's *current* live Scenario table. This is the
 * single place both `getRunDetail()` (rendering) and `updateScenarioResult()` (gate recompute)
 * source their scenario list from, so "prefer snapshot, fall back to live" only needs to be
 * correct once.
 *
 * Falls back to a live join in exactly two cases, both pre-REQ-030:
 *  - the Run has no `scenarioIdsJson` at all (created before REQ-030 made this unconditional) —
 *    covers every scenario currently configured for the site, today's original behavior; or
 *  - a covered id's `ScenarioResult` row has no snapshot yet (created before REQ-030, or the id
 *    was scoped but never touched on a pre-REQ-030 Run) — falls back to that one scenario's live
 *    def. If it no longer exists live either, it's dropped (nothing left to show/count for it —
 *    same as today's silent-vanish behavior for that one already-imperfect case).
 */
async function resolveRunScenarios(
  siteKey: string,
  run: RunEntity,
  results: ScenarioResultEntity[]
): Promise<ResolvedRunScenario[]> {
  const resultsByScenarioId = new Map(results.map((r) => [r.scenarioId, r]));

  let orderedIds: string[];
  if (run.scenarioIdsJson) {
    try {
      const parsed = JSON.parse(run.scenarioIdsJson);
      orderedIds = Array.isArray(parsed) ? parsed : [];
    } catch {
      orderedIds = [];
    }
  } else {
    const siteFile = await getScenariosForSite(siteKey);
    orderedIds = siteFile ? siteFile.scenarios.map((s) => s.id) : [];
  }

  const needsLiveFallback = orderedIds.some((id) => !resultsByScenarioId.get(id)?.name);
  let liveDefsById: Map<string, ScenarioDef> | undefined;
  if (needsLiveFallback) {
    const siteFile = await getScenariosForSite(siteKey);
    liveDefsById = new Map((siteFile?.scenarios ?? []).map((s) => [s.id, s]));
  }

  const resolved: ResolvedRunScenario[] = [];
  for (const id of orderedIds) {
    const result = resultsByScenarioId.get(id);
    if (result?.name) {
      resolved.push({ id, critical: result.critical });
      continue;
    }
    const def = liveDefsById?.get(id);
    if (def) resolved.push({ id, critical: def.critical, def });
  }
  return resolved;
}

/** Shared by GET /api/runs/[site]/[runId] and the run detail page's server-side fetch. */
export async function getRunDetail(
  siteKey: string,
  runId: string
): Promise<{ run: RunEntity; scenarios: ScenarioWithResult[]; lockEvents: RunLockEventEntity[] } | undefined> {
  const run = await getRun(siteKey, runId);
  if (!run) return undefined;

  const partitionKey = makeRunPartitionKey(siteKey, runId);
  const [results, lockEvents] = await Promise.all([
    listScenarioResults(partitionKey),
    listRunLockEvents(partitionKey),
  ]);
  const resultsByScenarioId = new Map(results.map((r) => [r.scenarioId, r]));
  const resolved = await resolveRunScenarios(siteKey, run, results);

  const scenarios: ScenarioWithResult[] = resolved.map(({ id, def }) => {
    const result = resultsByScenarioId.get(id);
    if (result?.name) {
      // Protected path (REQ-030): every displayed field comes from the snapshot taken when this
      // scenario entered the Run's scope, immune to later edits/deletes of the live Scenario.
      // tags/sourceSite aren't rendered anywhere on the Board/report, so left blank here.
      return {
        id,
        flow: (result.flow ?? "General") as ScenarioDef["flow"],
        name: result.name,
        desc: result.desc ?? "",
        role: result.role ?? "",
        critical: result.critical,
        steps: result.steps ?? "",
        criteria: result.criteria ?? "",
        sourceSite: "",
        status: result.status,
        notes: result.notes,
        evidence: parseEvidence(result.evidenceJson),
      };
    }
    // Pre-REQ-030 fallback — def is guaranteed present here (resolveRunScenarios only emits an
    // entry when it has a snapshot OR a live def to fall back to).
    return {
      ...def!,
      status: result?.status ?? "notrun",
      notes: result?.notes ?? "",
      evidence: parseEvidence(result?.evidenceJson),
    };
  });

  return { run, scenarios, lockEvents };
}

export interface CreateRunInput {
  siteKey: string;
  // No runId here — the Run id is system-generated (REQ-032, see lib/db/id-sequence.ts's
  // nextRunId()), never accepted from a caller, so a bypassed/tampered request can't set it.
  environment: string;
  testCycle: string;
  executedDate: string;
  tester: string;
  /** Free-text label for what this run is for (e.g. "Pre-UAT Smoke — Release 2.4.0") — see
   *  RunEntity.name's doc comment. Optional, defaults to "". */
  name?: string;
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

/** REQ-031: thrown by every write path once a Run is locked — enforced here, at the lib/runs.ts
 *  layer, not just hidden in the UI (same defense-in-depth precedent as createRun()'s inactive-
 *  site check). 409 Conflict: the request is well-formed, but the resource's current state
 *  refuses it. */
export class RunLockedError extends CreateRunError {
  constructor() {
    super("This Run is locked and can no longer be edited", 409);
  }
}

/** Shared by the POST /api/runs route handler and the "new run" Server Action. */
export async function createRun(input: CreateRunInput): Promise<RunEntity> {
  if (!input.siteKey) {
    throw new CreateRunError("siteKey is required", 400);
  }

  const siteFile = await getScenariosForSite(input.siteKey);
  if (!siteFile) {
    throw new CreateRunError(`Unknown siteKey: ${input.siteKey}`, 400);
  }

  // Defense-in-depth: the New Run page already blocks this at render time (no form shown for an
  // inactive site), but a direct POST must not be able to bypass that.
  const site = await getSite(input.siteKey);
  if (site && !site.active) {
    throw new CreateRunError("This site is inactive — new Runs cannot be started here", 400);
  }

  // System-generated, never client-supplied (REQ-032) — a fresh, atomically-incremented number
  // per site, so it can never collide with an existing Run the way a free-text id could.
  const runId = await nextRunId(input.siteKey);

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

  // Snapshot the final scope, always (REQ-030) — not just when a Suite/Tag filter narrowed it.
  // Previously this was only set inside the Suite/Tag branches above, so an unscoped Run had no
  // frozen id list at all and fell back to "whatever the site's Scenario table currently has,"
  // the same live-join problem REQ-030 exists to fix, just one level up (membership, not content):
  // a Scenario deleted later would silently vanish from every historical unscoped Run too. Always
  // snapshotting here means resolveRunScenarios() (below) never needs that fallback for any Run
  // created from now on.
  const scenarioIdsJson = JSON.stringify(scopedScenarios.map((s) => s.id));

  const total = scopedScenarios.length;

  const run: RunEntity = {
    partitionKey: input.siteKey,
    rowKey: runId,
    siteName: siteFile.siteName,
    name: input.name || "",
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
    locked: false,
    scenarioIdsJson,
    ...(suiteIdsJson && { suiteIdsJson, suiteNamesJson }),
    ...(tagIncludeIdsJson && { tagIncludeIdsJson, tagIncludeNamesJson, tagIncludeMode }),
    ...(tagExcludeIdsJson && { tagExcludeIdsJson, tagExcludeNamesJson }),
  };

  await upsertRun(run);

  // REQ-030: eagerly snapshot every scoped scenario's content into its own ScenarioResult row
  // right now, not lazily on first Pass/Fail — this is what lets an untouched "Not Run" scenario
  // still have a real, frozen record (resolveRunScenarios()/getRunDetail() key off this row's
  // `name` field to decide whether a snapshot exists). Independent primary keys, so Promise.all
  // is safe — no ordering dependency between rows.
  const partitionKey = makeRunPartitionKey(input.siteKey, runId);
  await Promise.all(
    scopedScenarios.map((def) =>
      upsertScenarioResult({
        partitionKey,
        rowKey: sanitizeScenarioId(def.id),
        scenarioId: def.id,
        status: "notrun",
        notes: "",
        critical: def.critical,
        name: def.name,
        desc: def.desc,
        role: def.role,
        flow: def.flow,
        steps: def.steps,
        criteria: def.criteria,
      })
    )
  );

  return run;
}

export interface UpdateRunMetadataInput {
  name?: string;
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
  if (run.locked) {
    throw new RunLockedError();
  }

  const updated: RunEntity = {
    ...run,
    name: input.name ?? run.name,
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
  if (run.locked) {
    throw new RunLockedError();
  }

  const partitionKey = makeRunPartitionKey(siteKey, runId);
  const existingResults = await listScenarioResults(partitionKey);
  const resultsByScenarioId = new Map(existingResults.map((r) => [r.scenarioId, r]));

  const previous = resultsByScenarioId.get(scenarioId);
  const updated: ScenarioResultEntity = {
    // Spread first so an existing REQ-030 snapshot (name/desc/role/flow/steps/criteria) survives
    // a status/notes-only update instead of being nulled out by upsertScenarioResult().
    ...(previous ?? {}),
    partitionKey,
    rowKey: sanitizeScenarioId(scenarioId),
    scenarioId,
    status: input.status ?? previous?.status ?? "notrun",
    notes: input.notes ?? previous?.notes ?? "",
    critical: previous ? previous.critical : scenarioDef.critical,
  };
  await upsertScenarioResult(updated);
  resultsByScenarioId.set(scenarioId, updated);

  // Recompute aggregate metrics + gate across only this run's scoped scenarios, sourced from
  // resolveRunScenarios() (REQ-030) — the snapshot-first, live-fallback-only-for-legacy-rows rule,
  // not a live Scenario join. A Suite-scoped run must not count out-of-scope scenarios as "notrun"
  // forever, or its gate could never reach READY.
  const runScenarios = await resolveRunScenarios(siteKey, run, [...resultsByScenarioId.values()]);
  const resultsRecord = Object.fromEntries(resultsByScenarioId);
  let passed = 0,
    failed = 0,
    blocked = 0,
    notrun = 0;
  for (const rs of runScenarios) {
    const status = resultsRecord[rs.id]?.status ?? "notrun";
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
  if (run.locked) throw new RunLockedError();

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

  // Spread the previous row first so an existing REQ-030 snapshot survives an evidence-only
  // update instead of being nulled out.
  await upsertScenarioResult({
    ...(previous ?? {}),
    partitionKey,
    rowKey: sanitizeScenarioId(scenarioId),
    scenarioId,
    status: previous?.status ?? "notrun",
    notes: previous?.notes ?? "",
    critical: previous ? previous.critical : scenarioDef.critical,
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

  const run = await getRun(siteKey, runId);
  if (!run) throw new CreateRunError("Run not found", 404);
  if (run.locked) throw new RunLockedError();

  const partitionKey = makeRunPartitionKey(siteKey, runId);
  const previous = await findScenarioResult(partitionKey, scenarioId);
  const evidence = parseEvidence(previous?.evidenceJson);

  const target = evidence.find((e) => e.id === evidenceId);
  if (!target) {
    throw new CreateRunError("Evidence not found", 404);
  }

  await deleteEvidenceBlob(target.blobName);
  const updatedEvidence = evidence.filter((e) => e.id !== evidenceId);

  // Spread the previous row first so an existing REQ-030 snapshot survives an evidence-only
  // update instead of being nulled out.
  await upsertScenarioResult({
    ...(previous ?? {}),
    partitionKey,
    rowKey: sanitizeScenarioId(scenarioId),
    scenarioId,
    status: previous?.status ?? "notrun",
    notes: previous?.notes ?? "",
    critical: previous ? previous.critical : scenarioDef.critical,
    evidenceJson: JSON.stringify(updatedEvidence),
  });

  return { evidence: updatedEvidence };
}

// ---------- Run Lock / Finalize (REQ-031) ----------

/**
 * Locks a Run. Available to any authenticated user (same permission boundary the Scenario Board
 * already has — see requireApiUser() at the API route, not requireApiRole()): "the QA who ran it
 * locks it when done" is a self-service action, not an admin/qa_lead-gated one. Not gated on
 * gateResult — locking means testing is *done*, not that it passed; a final NOT READY result is
 * just as legitimate to lock as a READY one.
 */
export async function lockRun(siteKey: string, runId: string, byEmail: string): Promise<RunEntity> {
  const run = await getRun(siteKey, runId);
  if (!run) throw new CreateRunError("Run not found", 404);
  if (run.locked) throw new CreateRunError("Run is already locked", 400);

  const updated: RunEntity = {
    ...run,
    locked: true,
    lockedAt: new Date().toISOString(),
    lockedBy: byEmail,
  };
  await upsertRun(updated);
  await addRunLockEvent(makeRunPartitionKey(siteKey, runId), "LOCK", byEmail);
  return updated;
}

/**
 * Unlocks a Run — restricted to admin/qa_lead at the call site (requireApiRole(CAN_EDIT_CONTENT)
 * in the route handler, not here, matching updateRunMetadata()'s existing convention). A reason is
 * required and permanently logged to RunLockEvent (never overwritten — a Run can be locked and
 * unlocked more than once, and every past reason should stay inspectable).
 */
export async function unlockRun(
  siteKey: string,
  runId: string,
  byEmail: string,
  reason: string
): Promise<RunEntity> {
  if (!reason?.trim()) {
    throw new CreateRunError("A reason is required to unlock a Run", 400);
  }
  const run = await getRun(siteKey, runId);
  if (!run) throw new CreateRunError("Run not found", 404);
  if (!run.locked) throw new CreateRunError("Run is not locked", 400);

  const updated: RunEntity = { ...run, locked: false, lockedAt: undefined, lockedBy: undefined };
  await upsertRun(updated);
  await addRunLockEvent(makeRunPartitionKey(siteKey, runId), "UNLOCK", byEmail, reason.trim());
  return updated;
}

/** Newest-first Lock/Unlock history for a Run — used by getRunDetail() to show a Lock History list. */
export async function getRunLockHistory(siteKey: string, runId: string): Promise<RunLockEventEntity[]> {
  return listRunLockEvents(makeRunPartitionKey(siteKey, runId));
}
