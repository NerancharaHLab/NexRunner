// Deliberately named "test-suites-table.ts", not "suites-table.ts" — this
// project already has sites-table.ts (Hospital Sites, a completely
// different concept), and the two names being one character apart is a
// real mix-up risk. Keep this spelled-out name.
import { odata } from "@azure/data-tables";
import {
  SUITE_PARTITION,
  parseSuiteScenarioIds,
  sanitizeScenarioId,
  type SuiteDef,
  type SuiteEntity,
} from "@/lib/types";
import { getTable } from "./client";

const SUITES_TABLE = "Suites";

async function getSuitesTable() {
  return getTable(SUITES_TABLE);
}

function entityToDef(e: SuiteEntity): SuiteDef {
  return {
    id: e.suiteId,
    name: e.name,
    description: e.description,
    scenarioIds: parseSuiteScenarioIds(e),
  };
}

export async function listSuites(): Promise<SuiteDef[]> {
  const table = await getSuitesTable();
  const results: SuiteEntity[] = [];
  const iter = table.listEntities<SuiteEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${SUITE_PARTITION}` },
  });
  for await (const entity of iter) {
    results.push(entity as unknown as SuiteEntity);
  }
  return results.map(entityToDef).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSuite(suiteId: string): Promise<SuiteDef | undefined> {
  const table = await getSuitesTable();
  try {
    const entity = await table.getEntity<SuiteEntity>(SUITE_PARTITION, sanitizeScenarioId(suiteId));
    return entityToDef(entity as unknown as SuiteEntity);
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404) return undefined;
    throw err;
  }
}

export interface SuiteInput {
  id: string;
  name: string;
  description: string;
  scenarioIds: string[];
}

export async function createSuite(input: SuiteInput): Promise<void> {
  const table = await getSuitesTable();
  const entity: SuiteEntity = {
    partitionKey: SUITE_PARTITION,
    rowKey: sanitizeScenarioId(input.id),
    suiteId: input.id,
    name: input.name,
    description: input.description,
    scenarioIdsJson: JSON.stringify(input.scenarioIds),
  };
  await table.upsertEntity(entity, "Replace");
}

export async function updateSuite(originalSuiteId: string, input: SuiteInput): Promise<void> {
  const table = await getSuitesTable();
  const newRowKey = sanitizeScenarioId(input.id);
  const oldRowKey = sanitizeScenarioId(originalSuiteId);

  const entity: SuiteEntity = {
    partitionKey: SUITE_PARTITION,
    rowKey: newRowKey,
    suiteId: input.id,
    name: input.name,
    description: input.description,
    scenarioIdsJson: JSON.stringify(input.scenarioIds),
  };
  await table.upsertEntity(entity, "Replace");

  if (newRowKey !== oldRowKey) {
    await table.deleteEntity(SUITE_PARTITION, oldRowKey).catch(() => {
      // Already gone / never existed — fine either way.
    });
  }
}

export async function deleteSuite(suiteId: string): Promise<void> {
  const table = await getSuitesTable();
  await table.deleteEntity(SUITE_PARTITION, sanitizeScenarioId(suiteId));
}
