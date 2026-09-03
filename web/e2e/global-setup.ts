import path from "path";

// Runs once before the whole suite (see playwright.config.ts's `globalSetup`).
// Loads .env.local the same way the app's own dev server does (Next.js reads
// it automatically; this standalone Node process — not spawned via `npm run
// dev` — needs it loaded explicitly since it talks to Postgres directly
// through the same lib/db/* modules the app uses).
process.loadEnvFile(path.resolve(__dirname, "../.env.local"));

import { createUser, getUserByEmail } from "../lib/db/users-table";
import { hashPassword } from "../lib/auth/password";
import { upsertSite } from "../lib/db/sites-table";
import { createScenario, deleteScenario, listScenariosForSite } from "../lib/db/scenarios-table";
import { isActiveUser, parseRoles } from "../lib/types";

export const E2E_SITE_KEY = "E2E";
export const E2E_SITE_NAME = "E2E (Automated Test Site)";

// Second permanent fixture site — REQ-039's Suite site-scoping only shows real behavior across
// two distinct real Sites (a Suite scoped to one site must be absent from the other's New Run
// picker). No existing spec asserts an exact count of sites/runs anywhere, only per-site row
// counts, so adding this is safe for the other 9 spec files.
export const E2E_SITE_KEY_2 = "E2EB";
export const E2E_SITE_NAME_2 = "E2E Site B (Automated Test Site)";

export const E2E_USERS = {
  admin: { email: "e2e-admin@test.com", password: "E2ePassw0rd!", displayName: "E2E Admin", role: "admin" as const },
  qaLead: { email: "e2e-qalead@test.com", password: "E2ePassw0rd!", displayName: "E2E QA Lead", role: "qa_lead" as const },
  qaEngineer: {
    email: "e2e-qaengineer@test.com",
    password: "E2ePassw0rd!",
    displayName: "E2E QA Engineer",
    role: "qa_engineer" as const,
  },
};

export const E2E_SCENARIOS = [
  {
    id: "E2E-SC-01",
    flow: "General" as const,
    name: "E2E Scenario One (critical)",
    desc: "Seeded fixture scenario for automated tests.",
    role: "QA",
    critical: true,
    steps: "1. Do the thing.",
    criteria: "The thing works.",
  },
  {
    id: "E2E-SC-02",
    flow: "General" as const,
    name: "E2E Scenario Two",
    desc: "Seeded fixture scenario for automated tests.",
    role: "QA",
    critical: false,
    steps: "1. Do another thing.",
    criteria: "That thing also works.",
  },
  {
    id: "E2E-SC-03",
    flow: "General" as const,
    name: "E2E Scenario Three",
    desc: "Seeded fixture scenario for automated tests.",
    role: "QA",
    critical: false,
    steps: "1. Do a third thing.",
    criteria: "That thing works too.",
  },
];

async function ensureUser(user: { email: string; password: string; displayName: string; role: "admin" | "qa_lead" | "qa_engineer" }) {
  // createUser upserts (Replace) under the hood, so this is idempotent
  // either way — the existence check just avoids re-hashing the password on
  // every run for no reason. Also resets roles/active back to the canonical
  // single-role + active state in case a previous test run left the fixture
  // user with an extra role assigned or deactivated (08-admin-user-crud
  // mutates these).
  const existing = await getUserByEmail(user.email);
  const currentRoles = existing ? parseRoles(existing) : [];
  if (existing && isActiveUser(existing) && currentRoles.length === 1 && currentRoles[0] === user.role) return;
  const passwordHash = await hashPassword(user.password);
  await createUser({ email: user.email, passwordHash, displayName: user.displayName, roles: [user.role] });
}

export default async function globalSetup() {
  await Promise.all(Object.values(E2E_USERS).map(ensureUser));
  await upsertSite(E2E_SITE_KEY, E2E_SITE_NAME);
  await upsertSite(E2E_SITE_KEY_2, E2E_SITE_NAME_2);

  // Reset to exactly the 3 canonical scenarios — several specs (notably
  // 06-reports, which asserts exact totals) assume the E2E site's scenario
  // count is stable. Without this, a scenario left behind by an interrupted
  // Admin Scenario CRUD test run (created but not reached its own delete
  // step) would silently inflate every subsequent run's totals.
  const canonicalIds = new Set(E2E_SCENARIOS.map((s) => s.id));
  const existing = await listScenariosForSite(E2E_SITE_KEY);
  await Promise.all(
    existing.filter((s) => !canonicalIds.has(s.id)).map((s) => deleteScenario(E2E_SITE_KEY, s.id))
  );

  for (const scenario of E2E_SCENARIOS) {
    await createScenario(E2E_SITE_KEY, scenario);
  }
}
