import type { ScenarioSiteFile } from "@/lib/types";
import { listScenariosForSite } from "@/lib/azure/scenarios-table";
import { getSite } from "@/lib/azure/sites-table";

// Scenario/Site data used to be static JSON bundled at build time
// (data/scenarios/*.json). It's now DB-backed (Scenarios/Sites tables) so it
// can be edited via /admin/scenarios without a redeploy — see
// ~/.claude/plans/streamed-wibbling-lamport.md. Re-exported here under the
// same function names/shapes as before so every existing call site
// (app/page.tsx, app/[site]/page.tsx, app/[site]/new/page.tsx, lib/runs.ts)
// only needed `await` added, not a redesign.

export { listSites } from "@/lib/azure/sites-table";

export async function getScenariosForSite(siteKey: string): Promise<ScenarioSiteFile | undefined> {
  const site = await getSite(siteKey);
  if (!site) return undefined;
  const scenarios = await listScenariosForSite(siteKey);
  return { site: site.id, siteName: site.name, scenarios };
}
