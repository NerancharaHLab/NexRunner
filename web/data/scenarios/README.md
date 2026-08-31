# Seed data only — not used by the running app

These JSON files are **no longer read by the Next.js app at runtime** — Scenario and Site data
now live in Azure Table Storage (`Scenarios`/`Sites` tables, see `lib/azure/scenarios-table.ts` /
`lib/azure/sites-table.ts`), editable via `/admin/scenarios`.

This folder is kept only as the **source data for `temp_scripts/seed_scenarios_and_sites.ts`** —
the one-off script used to seed a fresh environment's DB (local Azurite, and later the real
Azure/Cosmos DB table once provisioned, per `web/README.md` "Cosmos DB Free Tier"). If these files
drift from what's actually in production (because someone edited a Scenario via the admin UI),
that's expected and fine — re-running the seed script against a *fresh, empty* DB is the only
time these files matter again.
