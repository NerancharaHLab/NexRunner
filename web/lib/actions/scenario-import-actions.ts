"use server";

// REQ-022 Phase 2 — the only new server-side code this phase adds; everything else in the feature
// is UI (app/admin/ScenarioImportModal.tsx) calling straight through to Phase 1's already-built
// lib/scenario-import.ts functions. Two explicit stages so the client can show a dry-run preview
// before anything is written: preview (parse+validate, no DB writes) -> confirm (commit, atomic).
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";
import { listTags } from "@/lib/db/tags-table";
import {
  commitScenarioImport,
  parseScenarioImportCsv,
  validateScenarioImportRows,
  type ScenarioImportRow,
  type ScenarioImportRowError,
  type ScenarioImportTarget,
} from "@/lib/scenario-import";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB, matches next.config.ts's serverActions.bodySizeLimit
const MAX_ROWS = 100;

export interface ScenarioImportPreviewResult {
  validRows: ScenarioImportRow[];
  errors: ScenarioImportRowError[];
  totalCount: number;
}

/**
 * Stage 1: parse + validate only, never writes to the DB — safe to call as many times as the user
 * re-uploads a corrected file. Enforces file-size/row-count limits server-side (never trust a
 * client-side-only check, same defense-in-depth precedent as createRun()'s inactive-site guard).
 */
export async function previewScenarioImportAction(
  target: ScenarioImportTarget,
  formData: FormData
): Promise<ScenarioImportPreviewResult> {
  await requireRole(CAN_EDIT_CONTENT);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { validRows: [], errors: [{ row: 0, column: "", message: "No file was uploaded" }], totalCount: 0 };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      validRows: [],
      errors: [{ row: 0, column: "", message: `File is too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)` }],
      totalCount: 0,
    };
  }

  const csvText = await file.text();
  const { raw, parseErrors } = parseScenarioImportCsv(csvText);

  if (raw.length > MAX_ROWS) {
    return {
      validRows: [],
      errors: [{ row: 0, column: "", message: `Too many rows (${raw.length}) — max ${MAX_ROWS} per file` }],
      totalCount: raw.length,
    };
  }
  if (parseErrors.length > 0) {
    return { validRows: [], errors: parseErrors, totalCount: raw.length };
  }

  const existingTags = await listTags();
  const { valid, errors } = validateScenarioImportRows(raw, existingTags);
  return { validRows: valid, errors, totalCount: raw.length };
}

/**
 * Stage 2: commits already-validated rows. Only accepts the validated ScenarioImportRow type
 * (structurally impossible to call with raw/unvalidated data) and re-checks it isn't empty in case
 * of a tampered/stale client request — the real all-or-nothing guarantee comes from
 * commitScenarioImport()'s own transaction.
 */
export async function confirmScenarioImportAction(
  target: ScenarioImportTarget,
  rows: ScenarioImportRow[]
): Promise<{ createdIds: string[] }> {
  await requireRole(CAN_EDIT_CONTENT);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No valid rows to import");
  }
  if (rows.length > MAX_ROWS) {
    throw new Error(`Too many rows (${rows.length}) — max ${MAX_ROWS} per file`);
  }
  return commitScenarioImport(target, rows);
}
