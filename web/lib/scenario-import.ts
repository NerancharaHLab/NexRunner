// REQ-022 Phase 1: CSV bulk import for Scenarios — backend core only (no upload UI/Excel yet, see
// specs/REQ-022_csv_excel_scenario_import.md). Splits into three explicit stages so a future UI can
// show a dry-run preview before committing anything:
//   parseScenarioImportCsv()   — text -> raw rows (no validation)
//   validateScenarioImportRows() — raw rows -> validated rows + errors (pure, no DB writes)
//   commitScenarioImport()    — validated rows -> real Scenarios, one atomic transaction
//
// Deliberately does not accept an `id` column — Master/Site Custom Scenario ids are always
// system-generated (REQ-032), never client-supplied, so every row gets a fresh id inside the
// commit transaction, in the same spirit as every other Scenario-creation path in this app.
import Papa from "papaparse";
import { prisma } from "./db/client";
import { createScenario } from "./db/scenarios-table";
import { nextCustomScenarioId, nextMasterScenarioId } from "./db/id-sequence";
import { MASTER_SCENARIO_PARTITION, sanitizeTagId, type ScenarioDef, type TagDef } from "./types";

export interface ScenarioImportRowError {
  /** 1-indexed against the actual file, header row included — a data row error reads as "row 2"
   *  for the file's first real row of data, matching what a user sees opening it in a spreadsheet. */
  row: number;
  column: string;
  message: string;
}

/** Everything ScenarioDef needs except `id` (never in the file — see file header) and `sourceSite`
 *  (present, but only meaningful for a Master-target import; a Site-target import always
 *  overrides it, same as the single-scenario Site Custom creation form already does). */
export type ScenarioImportRow = Omit<ScenarioDef, "id">;

const VALID_FLOWS: ScenarioDef["flow"][] = ["OPD", "IPD", "General"];
const TRUTHY = new Set(["true", "1", "yes"]);
const FALSY = new Set(["", "false", "0", "no"]);

export function parseScenarioImportCsv(csvText: string): {
  raw: Record<string, string>[];
  parseErrors: ScenarioImportRowError[];
} {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const parseErrors: ScenarioImportRowError[] = result.errors.map((e) => ({
    row: (e.row ?? 0) + 2, // Papa's row is 0-indexed against data rows only; +2 = +1 for the
    // header row +1 to convert 0-indexed -> 1-indexed, matching this module's row-numbering
    // convention documented on ScenarioImportRowError.
    column: "",
    message: e.message,
  }));
  return { raw: result.data, parseErrors };
}

function parseCritical(cell: string | undefined): boolean | undefined {
  const v = (cell ?? "").trim().toLowerCase();
  if (TRUTHY.has(v)) return true;
  if (FALSY.has(v)) return false;
  return undefined; // signals "unrecognized", not "false" — caller turns this into a row error
}

export function validateScenarioImportRows(
  raw: Record<string, string>[],
  existingTags: TagDef[]
): { valid: ScenarioImportRow[]; errors: ScenarioImportRowError[] } {
  const tagsBySanitizedId = new Map(existingTags.map((t) => [sanitizeTagId(t.name), t]));
  const valid: ScenarioImportRow[] = [];
  const errors: ScenarioImportRowError[] = [];

  raw.forEach((cells, i) => {
    const row = i + 2; // header is row 1, first data row is row 2 — see ScenarioImportRowError
    const rowErrors: ScenarioImportRowError[] = [];

    const name = (cells.name ?? "").trim();
    if (!name) {
      rowErrors.push({ row, column: "name", message: "Scenario Name is required" });
    }

    const flowRaw = (cells.flow ?? "").trim();
    let flow: ScenarioDef["flow"] = "OPD";
    if (flowRaw) {
      const match = VALID_FLOWS.find((f) => f.toLowerCase() === flowRaw.toLowerCase());
      if (!match) {
        rowErrors.push({
          row,
          column: "flow",
          message: `Unrecognized flow "${flowRaw}" — expected OPD, IPD, or General`,
        });
      } else {
        flow = match;
      }
    }

    let critical = false;
    if (cells.critical !== undefined && cells.critical.trim() !== "") {
      const parsed = parseCritical(cells.critical);
      if (parsed === undefined) {
        rowErrors.push({
          row,
          column: "critical",
          message: `Unrecognized value "${cells.critical}" — expected true/false, 1/0, or yes/no`,
        });
      } else {
        critical = parsed;
      }
    }

    const tagIds: string[] = [];
    const tagsCell = (cells.tags ?? "").trim();
    if (tagsCell) {
      for (const rawTag of tagsCell.split(";").map((t) => t.trim()).filter(Boolean)) {
        const match = tagsBySanitizedId.get(sanitizeTagId(rawTag));
        if (!match) {
          rowErrors.push({
            row,
            column: "tags",
            message: `Unknown tag "${rawTag}" — not in the Tag Catalog (create it first; import never auto-creates tags)`,
          });
        } else {
          tagIds.push(match.id);
        }
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    valid.push({
      flow,
      name,
      desc: (cells.desc ?? "").trim(),
      role: (cells.role ?? "").trim(),
      critical,
      steps: (cells.steps ?? "").trim(),
      criteria: (cells.criteria ?? "").trim(),
      tags: tagIds,
      sourceSite: (cells.sourcesite ?? "").trim(),
    });
  });

  return { valid, errors };
}

export type ScenarioImportTarget = { kind: "master" } | { kind: "site"; siteKey: string };

/**
 * Commits already-validated rows as real Scenarios, all in one transaction — either every row
 * becomes a real Scenario with a freshly-reserved id, or (on any failure) nothing does and no id
 * sequence number is consumed either, since Prisma rolls the whole transaction back. Only accepts
 * ScenarioImportRow (the validated type), not raw/untrusted input — structurally impossible to
 * call this with a row that hasn't been through validateScenarioImportRows() first.
 */
export async function commitScenarioImport(
  target: ScenarioImportTarget,
  rows: ScenarioImportRow[]
): Promise<{ createdIds: string[] }> {
  return prisma.$transaction(async (tx) => {
    const createdIds: string[] = [];
    for (const row of rows) {
      const id =
        target.kind === "master"
          ? await nextMasterScenarioId(tx)
          : await nextCustomScenarioId(target.siteKey, tx);
      const siteKey = target.kind === "master" ? MASTER_SCENARIO_PARTITION : target.siteKey;
      // sourceSite: Master import passes the row's own value through (createScenario() normalizes/
      // defaults it, same as the single-entry form); Site import always uses the site's own id,
      // ignoring whatever the row had — matches Site Custom Scenario creation's existing
      // auto-set-and-hide-the-field behavior (see admin/scenarios/[site]/new/page.tsx).
      const sourceSite = target.kind === "master" ? row.sourceSite : siteKey;
      await createScenario(siteKey, { ...row, id, sourceSite }, tx);
      createdIds.push(id);
    }
    return { createdIds };
  });
}
