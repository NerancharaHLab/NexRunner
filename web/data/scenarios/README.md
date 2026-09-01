# Seed data only — not used by the running app

These JSON files are **no longer read by the Next.js app at runtime** — Scenario and Site data
now live in PostgreSQL (`Scenario`/`Site` tables via Prisma, see `lib/db/scenarios-table.ts` /
`lib/db/sites-table.ts`; see `specs/REQ-029_postgres_migration.md` at the repo root for why this
moved off Azure Table Storage), editable via `/admin/scenarios`.

This folder is kept only as the **source data for `temp_scripts/seed_scenarios_and_sites.ts`** —
the one-off script used to seed a fresh environment's DB (`npm run db:up` + `npm run db:migrate`
first, see `web/README.md`). If these files drift from what's actually in production (because
someone edited a Scenario via the admin UI), that's expected and fine — re-running the seed script
against a *fresh, empty* DB is the only time these files matter again.
