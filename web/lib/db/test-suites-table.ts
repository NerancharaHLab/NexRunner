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
  siteId: string | null;
}): SuiteDef {
  return {
    id: row.suiteId,
    name: row.name,
    description: row.description,
    scenarioIds: row.scenarioIds,
    siteId: row.siteId,
  };
}

/**
 * REQ-039: `forSite` scopes the list to that Site's own Suites + Global ones (siteId === null) —
 * used only by the New Run page's Suite picker (`app/[site]/new/page.tsx`), which is the actual
 * business complaint this REQ exists to fix. Every other call site (the Suite CRUD admin pages,
 * which manage every Suite regardless of scope) omits it and keeps today's unfiltered behavior.
 */
export async function listSuites(opts?: { forSite?: string }): Promise<SuiteDef[]> {
  const rows = await prisma.suite.findMany({
    where: opts?.forSite ? { OR: [{ siteId: opts.forSite }, { siteId: null }] } : undefined,
  });
  return rows.map(rowToDef).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSuite(suiteId: string): Promise<SuiteDef | undefined> {
  const row = await prisma.suite.findUnique({ where: { id: sanitizeScenarioId(suiteId) } });
  return row ? rowToDef(row) : undefined;
}

/**
 * Usage count per Suite — how many Runs still reference it (`Run.suiteIds`, a native Postgres
 * text[]). Mirrors getTagUsageCounts()'s shape (lib/db/tags-table.ts): one query, tallied in JS.
 * Used only to WARN on delete (REQ-039 Decision #4) — Suite deletion is never actually blocked,
 * since a Run's own scenario snapshot (REQ-030/031) is already independent of the Suite's continued
 * existence.
 */
export async function getSuiteUsageCounts(): Promise<Record<string, number>> {
  const runs = await prisma.run.findMany({ select: { suiteIds: true } });
  const counts: Record<string, number> = {};
  for (const run of runs) {
    for (const id of run.suiteIds) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

export interface SuiteInput {
  id: string;
  name: string;
  description: string;
  scenarioIds: string[];
  siteId?: string | null;
}

export async function createSuite(input: SuiteInput): Promise<void> {
  const id = sanitizeScenarioId(input.id);
  const data = {
    suiteId: input.id,
    name: input.name,
    description: input.description,
    scenarioIds: input.scenarioIds,
    siteId: input.siteId ?? null,
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
