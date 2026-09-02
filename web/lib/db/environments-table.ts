// Environment Catalog — Prisma-backed replacement for the static ENVIRONMENTS array in
// lib/config.ts (see specs/REQ-024_environment_data_chain_schema_crud.md). Mirrors
// lib/db/sites-table.ts's shape (list/get/create/update/delete-with-in-use-guard).
import { prisma } from "./client";

export interface EnvironmentEntry {
  id: string;
  name: string;
  orderIndex: number;
  active: boolean;
}

function rowToEntry(row: { id: string; name: string; orderIndex: number; active: boolean }): EnvironmentEntry {
  return { id: row.id, name: row.name, orderIndex: row.orderIndex, active: row.active };
}

export async function listEnvironments(opts?: { includeInactive?: boolean }): Promise<EnvironmentEntry[]> {
  const rows = await prisma.environment.findMany({
    where: opts?.includeInactive ? undefined : { active: true },
    orderBy: { orderIndex: "asc" },
  });
  return rows.map(rowToEntry);
}

export async function getEnvironment(id: string): Promise<EnvironmentEntry | undefined> {
  const row = await prisma.environment.findUnique({ where: { id } });
  return row ? rowToEntry(row) : undefined;
}

/** New entries always append at the end of the display order — no reordering UI yet (see spec). */
export async function createEnvironment(name: string): Promise<EnvironmentEntry> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Environment name is required");
  const maxOrder = await prisma.environment.aggregate({ _max: { orderIndex: true } });
  const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
  const row = await prisma.environment.create({ data: { name: trimmed, orderIndex, active: true } });
  return rowToEntry(row);
}

export async function updateEnvironmentName(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Environment name is required");
  await prisma.environment.update({ where: { id }, data: { name: trimmed } });
}

export async function updateEnvironmentActive(id: string, active: boolean): Promise<void> {
  await prisma.environment.update({ where: { id }, data: { active } });
}

export class EnvironmentInUseError extends Error {
  usageCount: number;
  constructor(message: string, usageCount: number) {
    super(message);
    this.usageCount = usageCount;
  }
}

/**
 * Hard-blocks deleting an Environment that's still referenced by any Run's (denormalized, no FK)
 * `environment` string column — same shape as sites-table.ts's deleteSite()/SiteHasRunsError.
 * Deactivate is the reversible alternative for "stop offering this in the picker."
 */
export async function deleteEnvironment(id: string): Promise<void> {
  const env = await getEnvironment(id);
  if (!env) return;
  const usageCount = await prisma.run.count({ where: { environment: env.name } });
  if (usageCount > 0) {
    throw new EnvironmentInUseError(
      `Cannot delete — ${usageCount} existing Run(s) use "${env.name}". Deactivate it instead.`,
      usageCount
    );
  }
  await prisma.environment.delete({ where: { id } });
}
