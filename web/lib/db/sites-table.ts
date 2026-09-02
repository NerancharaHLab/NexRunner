import type { HospitalSiteEntry } from "@/lib/types";
import { prisma } from "./client";
import { listRunsForSite } from "./tables";

// Prisma-backed replacement for the old Table Storage "Sites" table (see
// specs/REQ-029_postgres_migration.md). Same exported function names/signatures as the old
// lib/azure/sites-table.ts. Site rows always have `active` set (NOT NULL @default(true) in
// schema.prisma) — no isActiveSite() backward-compat fallback needed here the way the old
// Table-Storage-era code needed it for rows written before the field existed.

function entityToEntry(row: { id: string; name: string; active: boolean }): HospitalSiteEntry {
  return { id: row.id, name: row.name, active: row.active };
}

export async function listSites(opts?: { includeInactive?: boolean }): Promise<HospitalSiteEntry[]> {
  const rows = await prisma.site.findMany({
    where: opts?.includeInactive ? undefined : { active: true },
  });
  return rows.map(entityToEntry).sort((a, b) => a.id.localeCompare(b.id));
}

export async function getSite(siteKey: string): Promise<HospitalSiteEntry | undefined> {
  const row = await prisma.site.findUnique({ where: { id: siteKey } });
  return row ? entityToEntry(row) : undefined;
}

// Used only by temp_scripts/seed_scenarios_and_sites.ts and e2e/global-setup.ts — upsert-by-id,
// always (re)activates.
export async function upsertSite(siteKey: string, name: string): Promise<void> {
  await prisma.site.upsert({
    where: { id: siteKey },
    create: { id: siteKey, name, active: true },
    update: { name, active: true },
  });
}

export class SiteAlreadyExistsError extends Error {}
export class SiteHasRunsError extends Error {}

export async function createSite(id: string, name: string): Promise<HospitalSiteEntry> {
  const trimmedId = id.trim();
  if (!trimmedId || !name.trim()) throw new Error("Site ID and Site name are required");
  const existing = await getSite(trimmedId);
  if (existing) {
    throw new SiteAlreadyExistsError(`Site "${trimmedId}" already exists`);
  }
  await prisma.site.create({ data: { id: trimmedId, name: name.trim(), active: true } });
  return { id: trimmedId, name: name.trim(), active: true };
}

// Partial update — must never clobber `active`, which this function doesn't touch (same contract
// as the old Table Storage "Merge" upsert). Site id is intentionally not accepted here; see the
// immutability note on the SiteEntity type in lib/types.ts.
export async function updateSiteName(id: string, name: string): Promise<void> {
  await prisma.site.update({ where: { id }, data: { name } });
}

export async function updateSiteActive(id: string, active: boolean): Promise<void> {
  await prisma.site.update({ where: { id }, data: { active } });
}

/**
 * Deletes a Site, but only if it has no Runs and no Suites still scoped to it — Run history is an
 * audit trail that must never silently disappear because someone deleted the site it belongs to;
 * Deactivate is the reversible alternative for "stop using this site." (REQ-039: Suite.siteId is a
 * real FK with no onDelete override, i.e. Postgres would reject the delete outright once a Suite
 * references this site — this app-level check exists so that shows up as the same friendly guard
 * as the Runs case above, not a raw DB constraint error.) Scenario rows for the site are NOT
 * cleaned up (same tolerance the app already has elsewhere for orphaned references), same as before.
 */
export async function deleteSite(id: string): Promise<void> {
  const runs = await listRunsForSite(id);
  if (runs.length > 0) {
    throw new SiteHasRunsError(
      `Cannot delete — this site has ${runs.length} existing Run(s). Deactivate it instead.`
    );
  }
  const suiteCount = await prisma.suite.count({ where: { siteId: id } });
  if (suiteCount > 0) {
    throw new SiteHasRunsError(
      `Cannot delete — this site has ${suiteCount} Suite(s) still scoped to it. Deactivate it instead.`
    );
  }
  await prisma.site.delete({ where: { id } });
}
