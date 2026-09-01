import { sanitizeScenarioId, type ScenarioDef } from "@/lib/types";
import { prisma } from "./client";

// Prisma-backed replacement for the old Table Storage "Scenarios" table (see
// specs/REQ-029_postgres_migration.md). Same exported function names/signatures as the old
// lib/azure/scenarios-table.ts. tags is a native Postgres text[] column here — no parseScenarioTags()
// JSON-parsing step needed, it's already an array.

function rowToDef(row: {
  scenarioId: string;
  flow: string;
  name: string;
  desc: string;
  role: string;
  critical: boolean;
  steps: string;
  criteria: string;
  tags: string[];
}): ScenarioDef {
  return {
    id: row.scenarioId,
    flow: row.flow as ScenarioDef["flow"],
    name: row.name,
    desc: row.desc,
    role: row.role,
    critical: row.critical,
    steps: row.steps,
    criteria: row.criteria,
    tags: row.tags,
  };
}

export async function listScenariosForSite(siteKey: string): Promise<ScenarioDef[]> {
  const rows = await prisma.scenario.findMany({ where: { siteKey } });
  return rows.map(rowToDef);
}

export async function getScenario(
  siteKey: string,
  scenarioId: string
): Promise<ScenarioDef | undefined> {
  const row = await prisma.scenario.findUnique({
    where: { siteKey_rowKey: { siteKey, rowKey: sanitizeScenarioId(scenarioId) } },
  });
  return row ? rowToDef(row) : undefined;
}

export interface ScenarioInput {
  id: string;
  flow: "OPD" | "IPD" | "General";
  name: string;
  desc: string;
  role: string;
  critical: boolean;
  steps: string;
  criteria: string;
  tags?: string[];
}

export async function createScenario(siteKey: string, input: ScenarioInput): Promise<void> {
  const rowKey = sanitizeScenarioId(input.id);
  // "Replace" semantics like the old upsertEntity(entity, "Replace") — creating/re-creating a
  // scenario should fully define every field, never leave stale properties behind.
  const data = {
    scenarioId: input.id,
    flow: input.flow,
    name: input.name,
    desc: input.desc,
    role: input.role,
    critical: input.critical,
    steps: input.steps,
    criteria: input.criteria,
    tags: input.tags ?? [],
  };
  await prisma.scenario.upsert({
    where: { siteKey_rowKey: { siteKey, rowKey } },
    create: { siteKey, rowKey, ...data },
    update: data,
  });
}

export async function updateScenario(
  siteKey: string,
  originalScenarioId: string,
  input: ScenarioInput
): Promise<void> {
  const newRowKey = sanitizeScenarioId(input.id);
  const oldRowKey = sanitizeScenarioId(originalScenarioId);

  await createScenario(siteKey, input);

  // Scenario ID was edited (rare, but the id is the row key) — the old row is now an orphaned
  // duplicate, remove it.
  if (newRowKey !== oldRowKey) {
    await prisma.scenario
      .delete({ where: { siteKey_rowKey: { siteKey, rowKey: oldRowKey } } })
      .catch(() => {
        // Already gone / never existed — fine either way.
      });
  }
}

export async function deleteScenario(siteKey: string, scenarioId: string): Promise<void> {
  await prisma.scenario.delete({
    where: { siteKey_rowKey: { siteKey, rowKey: sanitizeScenarioId(scenarioId) } },
  });
}

/**
 * Clones one scenario from one partition (typically MASTER_SCENARIO_PARTITION) into another (a
 * real siteKey) — an independent copy, not a live link. Reuses createScenario()'s existing upsert,
 * so cloning onto a partition that already has a scenario with this id overwrites it, by design.
 */
export async function cloneScenario(
  fromPartition: string,
  toPartition: string,
  scenarioId: string
): Promise<ScenarioDef> {
  const source = await getScenario(fromPartition, scenarioId);
  if (!source) {
    throw new Error(`Scenario "${scenarioId}" not found in partition "${fromPartition}"`);
  }
  await createScenario(toPartition, source);
  return source;
}
