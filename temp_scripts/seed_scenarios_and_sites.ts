// One-off: reads the static web/data/scenarios/*.json files and writes their
// content into the `Scenario` + `Site` tables (PostgreSQL via Prisma — see
// specs/REQ-029_postgres_migration.md at the repo root). Run against a fresh,
// empty DB (npm run db:up + npm run db:migrate first, see web/README.md) to
// seed it with the starter Scenario/Site set.
//
// Usage (run from web/ so its .env.local is picked up — lib/db/client.ts
// loads it automatically):
//   cd web && npx tsx ../temp_scripts/seed_scenarios_and_sites.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createScenario } from "../web/lib/db/scenarios-table";
import { upsertSite } from "../web/lib/db/sites-table";
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
