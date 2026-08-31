// Core data types for the Smoke Test Runner (Next.js + Azure edition).
// See ~/.claude/plans/streamed-wibbling-lamport.md for the schema rationale
// (why this does NOT replicate the legacy localStorage JSON's field duplication).

export type ScenarioStatus = "passed" | "failed" | "blocked" | "notrun";

/**
 * Site keys used to be a fixed "NUH" | "SBH" | "TMH" | "Standard" union. Sites
 * now live in the `Sites` table (see azure/sites-table.ts) and can be added
 * without a code change, so this is intentionally just `string` — the DB is
 * the source of truth for which site keys are valid, not the type system.
 */
export type SiteKey = string;

/** App-facing scenario shape — same fields whether the source was the old bundled
 *  JSON or (now) the `Scenarios` table; see azure/scenarios-table.ts for the mapping. */
export interface ScenarioDef {
  id: string; // e.g. "SC-01", "SC-02 [A]" — original, unsanitized
  flow: "OPD" | "IPD" | "General";
  name: string;
  desc: string;
  role: string;
  critical: boolean;
  steps: string;
  criteria: string;
  // Tag ids (from the Tag Catalog, see TAG_PARTITION below) attached to this
  // scenario — used by createRun()'s tag Include/Exclude filter. Optional:
  // scenarios written before this feature has no tags, same "absent means
  // empty" tolerance as every other optional array field in this file.
  tags?: string[];
}

export interface ScenarioSiteFile {
  site: string;
  siteName: string;
  scenarios: ScenarioDef[];
}

/** App-facing hospital site shape (Table Storage internals hidden by azure/sites-table.ts). */
export interface HospitalSiteEntry {
  id: SiteKey;
  name: string;
}

/**
 * Reserved Scenarios-table PartitionKey for the Master Scenario Library — not
 * a real site (never a row in the Sites table, never shown in the home/new-run
 * site pickers). Double-underscore-wrapped so it can never collide with a
 * real hospital site key. Scenarios here are cloned into a real site's
 * scenarios (see azure/scenarios-table.ts's cloneScenario()), not shared
 * live — editing the master never changes a site's already-cloned copy.
 */
export const MASTER_SCENARIO_PARTITION = "__MASTER__";

/** Azure Table Storage entity: table "Suites". PartitionKey = "SUITE" (fixed), RowKey = suite id.
 *  A Suite is a named group of Master Scenario ids (many-to-many — a scenario can be in more than
 *  one Suite) used to scope which scenarios a Run covers. See azure/test-suites-table.ts.
 *  Note the file/table name is deliberately "Suites", spelled out fully in code — never
 *  abbreviated near "Sites" (Hospital Sites, a completely different table) to avoid mix-ups. */
export const SUITE_PARTITION = "SUITE";

export interface SuiteEntity {
  partitionKey: string;
  rowKey: string; // suite id
  suiteId: string; // original, unsanitized
  name: string;
  description: string;
  scenarioIdsJson: string; // JSON-stringified string[] of Master Scenario ids
}

/** App-facing Suite shape (Table Storage internals hidden by azure/test-suites-table.ts). */
export interface SuiteDef {
  id: string;
  name: string;
  description: string;
  scenarioIds: string[];
}

export function parseSuiteScenarioIds(entity: { scenarioIdsJson?: string }): string[] {
  if (!entity.scenarioIdsJson) return [];
  try {
    const parsed = JSON.parse(entity.scenarioIdsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Reserved Tags-table PartitionKey (own table, "Tags" — see azure/tags-table.ts).
 * A Tag lives on Master Scenarios (and travels with cloneScenario() like every
 * other scenario field) and is used by createRun()'s Include/Exclude filter
 * to scope a Run across Suites — the QA "tag convention" pattern
 * (@smoke/@p1/@regression) the user described from Playwright/Cypress/
 * TestRail/Xray-style tooling.
 */
export const TAG_PARTITION = "TAG";

/**
 * RowKey normalizer for Tags — unlike sanitizeScenarioId() below, this also
 * lowercases. A Tag has no separately-typed id the way a Scenario/Suite
 * does; its whole identity IS its (case-insensitive) name, so "Smoke" and
 * "smoke" must resolve to the same row to satisfy the confirmed
 * case-insensitive-duplicate requirement.
 */
export function sanitizeTagId(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/** Azure Table Storage entity: table "Tags". PartitionKey = "TAG" (fixed), RowKey = sanitizeTagId(name). */
export interface TagEntity {
  partitionKey: string;
  rowKey: string; // sanitizeTagId(name)
  name: string; // display casing, as first created
}

/** App-facing Tag shape (Table Storage internals hidden by azure/tags-table.ts). */
export interface TagDef {
  id: string;
  name: string;
}

/** Reads ScenarioEntity.tagsJson (absent/unparseable = no tags, same tolerance as parseSuiteScenarioIds). */
export function parseScenarioTags(entity: { tagsJson?: string }): string[] {
  if (!entity.tagsJson) return [];
  try {
    const parsed = JSON.parse(entity.tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type Role = "admin" | "qa_lead" | "qa_engineer";

export const ALL_ROLES: readonly Role[] = ["admin", "qa_lead", "qa_engineer"];

/** Roles allowed to create/edit/delete Scenarios and (once built) Sites. */
export const CAN_EDIT_CONTENT: readonly Role[] = ["admin", "qa_lead"];

/** True if userRoles contains at least one of allowed — the permission check every guard uses now that a user can hold more than one Role. */
export function hasAnyRole(userRoles: readonly Role[], allowed: readonly Role[]): boolean {
  return userRoles.some((r) => allowed.includes(r));
}

/** Azure Table Storage entity: table "Users". PartitionKey = "USER" (fixed), RowKey = lowercased email. */
export interface UserEntity {
  partitionKey: string;
  rowKey: string; // lowercased email
  passwordHash: string;
  displayName: string;
  // Table Storage can't hold an array directly, so roles are JSON-stringified
  // into one field (same trick as evidenceJson below) — parse with
  // parseRoles(), which also falls back to a legacy singular `role` field for
  // rows written before multi-role support existed.
  rolesJson?: string;
  role?: Role; // legacy singular field, kept readable for parseRoles()'s fallback only — never written by new code
  // Optional, not required — rows written before deactivate support existed
  // have no `active` property at all (Table Storage doesn't backfill new
  // columns onto old rows). Never read this directly; use isActiveUser()
  // below, which treats "field absent" as active (the correct backward-
  // compatible default — those accounts were never deactivated).
  active?: boolean;
  createdAt: string;
}

/** Reads UserEntity.rolesJson (or falls back to the legacy singular `role` field for old rows). */
export function parseRoles(entity: { rolesJson?: string; role?: Role }): Role[] {
  if (entity.rolesJson) {
    try {
      const parsed = JSON.parse(entity.rolesJson);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through to legacy field
    }
  }
  return entity.role ? [entity.role] : [];
}

/** True unless the row was explicitly deactivated (`active === false`) —
 *  rows with no `active` field at all (written before this feature existed)
 *  default to active, not inactive. */
export function isActiveUser(entity: { active?: boolean }): boolean {
  return entity.active !== false;
}

/** What's stored in the signed session cookie — never includes passwordHash.
 *  Roles/displayName/active are always read fresh from the Users table on
 *  every request (see lib/auth/guard.ts's getCurrentUser()), not trusted
 *  from the JWT, so role changes and deactivation take effect immediately. */
export interface SessionUser {
  email: string;
  displayName: string;
  roles: Role[];
}

/** Azure Table Storage entity: table "Scenarios". PartitionKey = siteKey, RowKey = sanitized scenario id. */
export interface ScenarioEntity {
  partitionKey: string;
  rowKey: string;
  scenarioId: string; // original, unsanitized (e.g. "SC-02 [A]")
  flow: "OPD" | "IPD" | "General";
  name: string;
  desc: string;
  role: string;
  critical: boolean;
  steps: string;
  criteria: string;
  // Table Storage can't hold an array directly — same JSON-stringified trick
  // as SuiteEntity.scenarioIdsJson. Parse with parseScenarioTags().
  tagsJson?: string;
}

/** Azure Table Storage entity: table "Sites". PartitionKey = "SITE" (fixed), RowKey = site id. */
export interface SiteEntity {
  partitionKey: string;
  rowKey: string; // site id, e.g. "NUH"
  name: string;
}

/** Azure Table Storage entity: table "Runs". PartitionKey = siteKey, RowKey = runId. */
export interface RunEntity {
  partitionKey: string; // siteKey
  rowKey: string; // runId
  siteName: string;
  environment: string;
  testCycle: string;
  executedDate: string; // YYYY-MM-DD
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
  gateResult: "READY" | "NOT READY";
  savedAt: string; // ISO timestamp, app-controlled (independent of Table Storage's own Timestamp)
  // Suite scoping — all optional; absent on every Run created before this
  // feature existed, which means "covers every scenario configured for the
  // site" (today's original behavior, unchanged). suiteId/suiteName are
  // traceability-only display fields (a Run can be scoped to 1-to-many
  // Suites at once, per real QA practice — no fixed cardinality); their
  // scenarios are unioned together. scenarioIdsJson is the actual snapshot
  // of which scenario ids this Run covers, taken at creation time so
  // editing a Suite's membership later never retroactively changes an
  // already-created Run's scope — see lib/runs.ts's scopeScenarios().
  suiteIdsJson?: string;
  suiteNamesJson?: string;
  scenarioIdsJson?: string;
  // Tag filter — all optional; absent on every Run created before this
  // feature existed (or on any Run where the tag filter simply wasn't
  // used). Combines with Suite scoping above via AND (Suite ∩ Tag) — see
  // createRun() in lib/runs.ts, which folds both into the single
  // scenarioIdsJson snapshot above. tagIncludeMode only matters when
  // tagIncludeIdsJson is present; defaults to "OR" (any selected tag
  // matches) if omitted.
  tagIncludeIdsJson?: string;
  tagIncludeNamesJson?: string;
  tagIncludeMode?: "AND" | "OR";
  tagExcludeIdsJson?: string;
  tagExcludeNamesJson?: string;
}

/** One uploaded evidence screenshot (metadata only — bytes live in Blob Storage, see azure/blob.ts). */
export interface EvidenceItem {
  id: string;
  blobName: string;
  uploadedAt: string; // ISO timestamp
}

/** Max attachments per scenario and max upload size — matches the old localStorage app's limits. */
export const EVIDENCE_MAX_PER_SCENARIO = 6;
export const EVIDENCE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const EVIDENCE_ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Azure Table Storage entity: table "ScenarioResults". PartitionKey = `${siteKey}_${runId}`, RowKey = sanitized scenario id. */
export interface ScenarioResultEntity {
  partitionKey: string;
  rowKey: string;
  scenarioId: string; // original, unsanitized (e.g. "SC-02 [A]")
  status: ScenarioStatus;
  notes: string;
  critical: boolean;
  // Table Storage entities can't hold a nested array, so evidence metadata is
  // JSON-stringified into one field (same trick the old app used in
  // localStorage, just server-side now) — parse with JSON.parse(...) as
  // EvidenceItem[], default "[]" when absent (older rows won't have it yet).
  evidenceJson?: string;
}

export function sanitizeScenarioId(id: string): string {
  // Table Storage RowKey disallows '/', '\\', '#', '?' and control chars.
  // Scenario ids like "SC-02 [A]" only contain a space + brackets, which are
  // technically legal, but we strip to alnum/dash for URL-safety in routes too.
  return id.replace(/[^a-zA-Z0-9-]/g, "");
}

export function makeRunPartitionKey(siteKey: string, runId: string): string {
  return `${siteKey}_${runId}`;
}

export function computeGateResult(m: {
  scenarios: ScenarioDef[];
  results: Record<string, ScenarioResultEntity>;
}): { criticalPass: boolean; gateResult: "READY" | "NOT READY" } {
  const critical = m.scenarios.filter((s) => s.critical);
  const criticalPass = critical.every(
    (s) => m.results[s.id]?.status === "passed"
  );
  const anyFailed = Object.values(m.results).some((r) => r.status === "failed");
  const anyBlocked = Object.values(m.results).some((r) => r.status === "blocked");
  const ready = criticalPass && !anyFailed && !anyBlocked && m.scenarios.length > 0;
  return { criticalPass, gateResult: ready ? "READY" : "NOT READY" };
}
