import { odata } from "@azure/data-tables";
import { isActiveSite, type HospitalSiteEntry, type SiteEntity } from "@/lib/types";
import { getTable } from "./client";
import { listRunsForSite } from "./tables";

const SITES_TABLE = "Sites";
const SITE_PARTITION = "SITE";

async function getSitesTable() {
  return getTable(SITES_TABLE);
}

function entityToEntry(e: SiteEntity): HospitalSiteEntry {
  return { id: e.rowKey, name: e.name, active: isActiveSite(e) };
}

export async function listSites(opts?: { includeInactive?: boolean }): Promise<HospitalSiteEntry[]> {
  const table = await getSitesTable();
  const results: SiteEntity[] = [];
  const iter = table.listEntities<SiteEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${SITE_PARTITION}` },
  });
  for await (const entity of iter) {
    results.push(entity as unknown as SiteEntity);
  }
  const entries = results.map(entityToEntry).sort((a, b) => a.id.localeCompare(b.id));
  return opts?.includeInactive ? entries : entries.filter((s) => s.active);
}

export async function getSite(siteKey: string): Promise<HospitalSiteEntry | undefined> {
  const table = await getSitesTable();
  try {
    const entity = await table.getEntity<SiteEntity>(SITE_PARTITION, siteKey);
    return entityToEntry(entity as unknown as SiteEntity);
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404) return undefined;
    throw err;
  }
}

// Used only by temp_scripts/seed_scenarios_and_sites.ts — upsert-by-id, always (re)activates.
export async function upsertSite(siteKey: string, name: string): Promise<void> {
  const table = await getSitesTable();
  const entity: SiteEntity = { partitionKey: SITE_PARTITION, rowKey: siteKey, name, active: true };
  await table.upsertEntity(entity, "Replace");
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
  const table = await getSitesTable();
  const entity: SiteEntity = { partitionKey: SITE_PARTITION, rowKey: trimmedId, name: name.trim(), active: true };
  await table.upsertEntity(entity, "Replace");
  return { id: trimmedId, name: name.trim(), active: true };
}

// Merge (not Replace) — a partial update must never clobber `active`, which this function doesn't
// touch. Site id is intentionally not accepted here; see the immutability note on SiteEntity above.
export async function updateSiteName(id: string, name: string): Promise<void> {
  const table = await getSitesTable();
  await table.updateEntity({ partitionKey: SITE_PARTITION, rowKey: id, name }, "Merge");
}

export async function updateSiteActive(id: string, active: boolean): Promise<void> {
  const table = await getSitesTable();
  await table.updateEntity({ partitionKey: SITE_PARTITION, rowKey: id, active }, "Merge");
}

/**
 * Deletes a Site, but only if it has no Runs — Run history is an audit trail that must never
 * silently disappear because someone deleted the site it belongs to; Deactivate is the reversible
 * alternative for "stop using this site." Scenario rows for the site are NOT cleaned up (left as
 * harmless orphans under a partition key no longer reachable via any Site lookup) — same tolerance
 * the app already has elsewhere for orphaned references (e.g. deleting a Tag doesn't scrub it out
 * of ScenarioEntity.tagsJson).
 */
export async function deleteSite(id: string): Promise<void> {
  const runs = await listRunsForSite(id);
  if (runs.length > 0) {
    throw new SiteHasRunsError(
      `Cannot delete — this site has ${runs.length} existing Run(s). Deactivate it instead.`
    );
  }
  const table = await getSitesTable();
  await table.deleteEntity(SITE_PARTITION, id);
}
