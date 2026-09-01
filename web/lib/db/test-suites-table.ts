// Deliberately named "test-suites-table.ts", not "suites-table.ts" — same reasoning as the old
// lib/azure/test-suites-table.ts this replaces (see specs/REQ-029_postgres_migration.md): this
// project already has sites-table.ts (Hospital Sites, a completely different concept), and the two
// names being one character apart is a real mix-up risk. Same exported function names/signatures as
// before; scenarioIds is a native Postgres text[] column here — no parseSuiteScenarioIds() JSON step.
import { sanitizeScenarioId, type SuiteDef } from "@/lib/types";
import { prisma } from "./client";

function rowToDef(row: {
  suiteId: string;
  name: string;
  description: string;
  scenarioIds: string[];
}): SuiteDef {
  return { id: row.suiteId, name: row.name, description: row.description, scenarioIds: row.scenarioIds };
}

export async function listSuites(): Promise<SuiteDef[]> {
  const rows = await prisma.suite.findMany();
  return rows.map(rowToDef).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSuite(suiteId: string): Promise<SuiteDef | undefined> {
  const row = await prisma.suite.findUnique({ where: { id: sanitizeScenarioId(suiteId) } });
  return row ? rowToDef(row) : undefined;
}

export interface SuiteInput {
  id: string;
  name: string;
  description: string;
  scenarioIds: string[];
}

export async function createSuite(input: SuiteInput): Promise<void> {
  const id = sanitizeScenarioId(input.id);
  const data = {
    suiteId: input.id,
    name: input.name,
    description: input.description,
    scenarioIds: input.scenarioIds,
  };
  await prisma.suite.upsert({ where: { id }, create: { id, ...data }, update: data });
}

export async function updateSuite(originalSuiteId: string, input: SuiteInput): Promise<void> {
  const newId = sanitizeScenarioId(input.id);
  const oldId = sanitizeScenarioId(originalSuiteId);

  await createSuite(input);

  if (newId !== oldId) {
    await prisma.suite.delete({ where: { id: oldId } }).catch(() => {
      // Already gone / never existed — fine either way.
    });
  }
}

export async function deleteSuite(suiteId: string): Promise<void> {
  await prisma.suite.delete({ where: { id: sanitizeScenarioId(suiteId) } });
}
