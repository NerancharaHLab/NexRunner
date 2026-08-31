import { odata } from "@azure/data-tables";
import type { RunEntity, ScenarioResultEntity } from "@/lib/types";
import { getTable } from "./client";

const RUNS_TABLE = "Runs";
const SCENARIO_RESULTS_TABLE = "ScenarioResults";

export async function getRunsTable() {
  return getTable(RUNS_TABLE);
}

export async function getScenarioResultsTable() {
  return getTable(SCENARIO_RESULTS_TABLE);
}

// ---------- Runs ----------

export async function upsertRun(run: RunEntity): Promise<void> {
  const table = await getRunsTable();
  await table.upsertEntity(run, "Replace");
}

export async function getRun(siteKey: string, runId: string): Promise<RunEntity | undefined> {
  const table = await getRunsTable();
  try {
    const entity = await table.getEntity<RunEntity>(siteKey, runId);
    return entity as unknown as RunEntity;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404) return undefined;
    throw err;
  }
}

export async function listRunsForSite(siteKey: string): Promise<RunEntity[]> {
  const table = await getRunsTable();
  const results: RunEntity[] = [];
  const iter = table.listEntities<RunEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${siteKey}` },
  });
  for await (const entity of iter) {
    results.push(entity as unknown as RunEntity);
  }
  // Newest first.
  results.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  return results;
}

// ---------- Scenario Results ----------

export async function upsertScenarioResult(entity: ScenarioResultEntity): Promise<void> {
  const table = await getScenarioResultsTable();
  await table.upsertEntity(entity, "Merge");
}

export async function listScenarioResults(
  runPartitionKey: string
): Promise<ScenarioResultEntity[]> {
  const table = await getScenarioResultsTable();
  const results: ScenarioResultEntity[] = [];
  const iter = table.listEntities<ScenarioResultEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${runPartitionKey}` },
  });
  for await (const entity of iter) {
    results.push(entity as unknown as ScenarioResultEntity);
  }
  return results;
}
