import { odata } from "@azure/data-tables";
import type { HospitalSiteEntry, SiteEntity } from "@/lib/types";
import { getTable } from "./client";

const SITES_TABLE = "Sites";
const SITE_PARTITION = "SITE";

async function getSitesTable() {
  return getTable(SITES_TABLE);
}

function entityToEntry(e: SiteEntity): HospitalSiteEntry {
  return { id: e.rowKey, name: e.name };
}

// Read-only for now (list/get) — create/update/delete is the deferred Site
// CRUD UI follow-up tracked in TODO.md, not built in this pass.

export async function listSites(): Promise<HospitalSiteEntry[]> {
  const table = await getSitesTable();
  const results: SiteEntity[] = [];
  const iter = table.listEntities<SiteEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${SITE_PARTITION}` },
  });
  for await (const entity of iter) {
    results.push(entity as unknown as SiteEntity);
  }
  return results.map(entityToEntry).sort((a, b) => a.id.localeCompare(b.id));
}

// Used only by temp_scripts/seed_scenarios_and_sites.ts for now — no UI calls
// this yet (Site CRUD UI is the deferred follow-up in TODO.md).
export async function upsertSite(siteKey: string, name: string): Promise<void> {
  const table = await getSitesTable();
  const entity: SiteEntity = { partitionKey: SITE_PARTITION, rowKey: siteKey, name };
  await table.upsertEntity(entity, "Replace");
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
