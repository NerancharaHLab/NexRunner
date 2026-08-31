import { odata } from "@azure/data-tables";
import { sanitizeScenarioId, type ScenarioDef, type ScenarioEntity } from "@/lib/types";
import { getTable } from "./client";

const SCENARIOS_TABLE = "Scenarios";

async function getScenariosTable() {
  return getTable(SCENARIOS_TABLE);
}

function entityToDef(e: ScenarioEntity): ScenarioDef {
  return {
    id: e.scenarioId,
    flow: e.flow,
    name: e.name,
    desc: e.desc,
    role: e.role,
    critical: e.critical,
    steps: e.steps,
    criteria: e.criteria,
  };
}

export async function listScenariosForSite(siteKey: string): Promise<ScenarioDef[]> {
  const table = await getScenariosTable();
  const results: ScenarioEntity[] = [];
  const iter = table.listEntities<ScenarioEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${siteKey}` },
  });
  for await (const entity of iter) {
    results.push(entity as unknown as ScenarioEntity);
  }
  return results.map(entityToDef);
}

export async function getScenario(
  siteKey: string,
  scenarioId: string
): Promise<ScenarioDef | undefined> {
  const table = await getScenariosTable();
  try {
    const entity = await table.getEntity<ScenarioEntity>(
      siteKey,
      sanitizeScenarioId(scenarioId)
    );
    return entityToDef(entity as unknown as ScenarioEntity);
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404) return undefined;
    throw err;
  }
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
}

export async function createScenario(siteKey: string, input: ScenarioInput): Promise<void> {
  const table = await getScenariosTable();
  const entity: ScenarioEntity = {
    partitionKey: siteKey,
    rowKey: sanitizeScenarioId(input.id),
    scenarioId: input.id,
    flow: input.flow,
    name: input.name,
    desc: input.desc,
    role: input.role,
    critical: input.critical,
    steps: input.steps,
    criteria: input.criteria,
  };
  // "Replace" not "Merge" — creating a scenario should fully define every
  // field, never leave stale properties from a previous entity at that key.
  await table.upsertEntity(entity, "Replace");
}

export async function updateScenario(
  siteKey: string,
  originalScenarioId: string,
  input: ScenarioInput
): Promise<void> {
  const table = await getScenariosTable();
  const newRowKey = sanitizeScenarioId(input.id);
  const oldRowKey = sanitizeScenarioId(originalScenarioId);

  const entity: ScenarioEntity = {
    partitionKey: siteKey,
    rowKey: newRowKey,
    scenarioId: input.id,
    flow: input.flow,
    name: input.name,
    desc: input.desc,
    role: input.role,
    critical: input.critical,
    steps: input.steps,
    criteria: input.criteria,
  };
  await table.upsertEntity(entity, "Replace");

  // Scenario ID was edited (rare, but the id is the RowKey) — the old
  // RowKey is now an orphaned duplicate, remove it.
  if (newRowKey !== oldRowKey) {
    await table.deleteEntity(siteKey, oldRowKey).catch(() => {
      // Already gone / never existed — fine either way.
    });
  }
}

export async function deleteScenario(siteKey: string, scenarioId: string): Promise<void> {
  const table = await getScenariosTable();
  await table.deleteEntity(siteKey, sanitizeScenarioId(scenarioId));
}

/**
 * Clones one scenario from one partition (typically MASTER_SCENARIO_PARTITION)
 * into another (a real siteKey) — an independent copy, not a live link.
 * Reuses createScenario()'s existing "Replace" upsert, so cloning onto a
 * partition that already has a scenario with this id overwrites it, by
 * design (re-cloning is how a site pulls a newer master version).
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
