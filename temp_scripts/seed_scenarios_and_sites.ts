// One-off: reads the (soon to be deleted) static web/data/scenarios/*.json
// files and writes their content into the new `Scenarios` + `Sites` Azure
// Table Storage tables. Run once against Azurite as part of verifying this
// migration; run once more against the real Azure/Cosmos DB table once
// that's provisioned (see web/README.md "Cosmos DB Free Tier").
//
// Usage (run from web/ so its node_modules/.env.local are picked up):
//   cd web && npx tsx --env-file=.env.local ../temp_scripts/seed_scenarios_and_sites.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createScenario } from "../web/lib/azure/scenarios-table";
import { upsertSite } from "../web/lib/azure/sites-table";
import type { ScenarioSiteFile } from "../web/lib/types";

const DATA_DIR = join(__dirname, "..", "web", "data", "scenarios");

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8")) as T;
}

// Shape of the raw sites.json on disk (about to be deleted once this script
// has migrated its content) — narrower than any lasting app type since only
// this one-off script reads it.
interface RawSitesJson {
  hospitals: { id: string; name: string; file: string }[];
}

async function main() {
  const sites = loadJson<RawSitesJson>("sites.json");

  let siteCount = 0;
  let scenarioCount = 0;

  for (const hospital of sites.hospitals) {
    await upsertSite(hospital.id, hospital.name);
    siteCount++;

    const file = hospital.id === "Standard" ? "standard.json" : `${hospital.id.toLowerCase()}.json`;
    const siteFile = loadJson<ScenarioSiteFile>(file);

    for (const sc of siteFile.scenarios) {
      await createScenario(hospital.id, {
        id: sc.id,
        flow: sc.flow,
        name: sc.name,
        desc: sc.desc,
        role: sc.role,
        critical: sc.critical,
        steps: sc.steps,
        criteria: sc.criteria,
      });
      scenarioCount++;
    }
    console.log(`Seeded ${siteFile.scenarios.length} scenarios for ${hospital.id}`);
  }

  console.log(`Done. Sites: ${siteCount}, Scenarios: ${scenarioCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
