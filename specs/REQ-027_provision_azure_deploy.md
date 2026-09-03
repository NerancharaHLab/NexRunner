# REQ-027: Provision production resources + Deploy

**Status:** 📋 Documentation prepared — provisioning itself deferred to production time, per user
decision (2026-09-02): "คนดูแล Azure เดี๋ยวไปทำตอนขึ้น production... dev เราเทสจาก docker ไปก่อน" (whoever
owns Azure access will handle this when actually going to production; dev/testing stays on Docker
until then).
**Priority:** P3

## Context

The original version of this spec predated [REQ-029](REQ-029_postgres_migration.md) (the Azure Table
Storage → PostgreSQL migration) and was stale: it described choosing between "Storage Account or
Cosmos DB Table API Free Tier" for the database, and pointed at REQ-018 for "Cosmos DB Table API
compatibility notes" — REQ-018 is actually the unrelated Fastify-split-and-revert detour, no such
notes exist there. Rewritten 2026-09-02 to match the app's actual current architecture (Postgres via
Prisma, Docker locally) before handing this off.

This REQ covers standing up **real** infrastructure and deploying to it — distinct from everything
else in this app, which runs entirely against local Docker Postgres + the Azurite Blob emulator.
Nothing here can be done by an agent: it needs real cloud account access, real billing/provisioning
rights, and real production secrets, none of which are available in this environment. Confirmed with
the user that this is explicitly deferred — this file exists to leave accurate, actionable
documentation for whoever picks it up at production time, not to attempt any of it now.

## What actually needs deciding + doing, when this is picked up

**Decision #1 (Postgres host) is now mostly resolved** (2026-09-03) — DevOps will handle actual
provisioning, and the user confirmed (via a screenshot of the real target: a `dev_cortex_readonly`
connection into a `dev_cortex` database on an Azure Database for PostgreSQL instance, region
southeast-asia, already hosting one schema per service — `ehr`, `hivent`, `user_management`, `ext`,
`pgmq`, `public`, ...) that Test Runner will get **its own new schema inside that same `dev_cortex`
database**, not a separate database. Full requirements for DevOps — env vars, the exact
`DATABASE_URL` shape with a `?schema=` selector, required DB permissions (write, not the read-only
role shown in the screenshot), migration/seed commands — are written up in full at
`docs/devops_handoff.md` (repo root), not duplicated here.

**Still genuinely open:**
1. **Exact schema name** — `docs/devops_handoff.md` suggests `test_runner` as a placeholder; DevOps
   confirms or renames.
2. **Where to host the Next.js app itself.** The app is fully dynamic now (Server Actions, a DB
   round-trip on nearly every request) — re-validate whether "Azure Static Web App" (the very first,
   pre-Postgres plan) is still the right fit, or whether Azure App Service / Container Apps (or a
   platform like Vercel/Railway/Fly.io, if going outside Azure is on the table) is a better match.
   Not decided. **The production `Dockerfile` (`web/Dockerfile`) exists now** regardless of this
   decision — it's needed for any container-based host (App Service, Container Apps, or otherwise),
   and does nothing platform-specific.
3. **Azure Storage Account for Evidence blobs** — unchanged from the original plan; a real Storage
   Account replaces the local Azurite emulator. Lower-risk, more mechanical than 1-2.

**Once decisions are made, the mechanical steps** (env vars, migrate/seed commands, verification
checklist) are all in `docs/devops_handoff.md` — this file only tracks the open decisions above.

## Verification

Not applicable until this is picked up for real provisioning — nothing to verify against real
infrastructure locally, since local dev/test deliberately keeps using Docker Postgres + Azurite
regardless of what production ends up using. The `Dockerfile` itself (image build only, not a real
deploy) is verified separately — see `docs/devops_handoff.md`'s own verification note.
