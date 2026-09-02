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

**Open decisions (need a human with infra/cost authority, not just a code decision):**
1. **Where to host PostgreSQL in production.** Options to weigh: Azure Database for PostgreSQL
   Flexible Server (keeps everything in one cloud, easiest network/auth story if the app itself is
   also on Azure), a managed provider (Supabase, Neon, etc.), or self-hosted on a VM (most control,
   most ops burden). No decision made — genuinely open.
2. **Where to host the Next.js app itself.** The app is fully dynamic now (Server Actions, a DB
   round-trip on nearly every request) — re-validate whether "Azure Static Web App" (the very first,
   pre-Postgres plan) is still the right fit, or whether Azure App Service / Container Apps (or a
   platform like Vercel/Railway/Fly.io, if going outside Azure is on the table) is a better match
   for a stateful Next.js app with Server Actions. Not decided.
3. **Azure Storage Account for Evidence blobs** — this part hasn't changed from the original plan; a
   real Storage Account replaces the local Azurite emulator. Lower-risk, more mechanical than 1-2.

**Once decisions are made, the mechanical steps are:**
1. Provision the chosen Postgres host; get a real `DATABASE_URL`.
2. Provision a real Azure Storage Account (Blob); get a real `AZURE_STORAGE_CONNECTION_STRING`.
3. Generate a real `AUTH_SECRET` (32-byte random — `openssl rand -base64 32`, never reuse the
   `.env.local.example` dev value).
4. Provision hosting for the Next.js app itself and wire the 3 env vars above into it.
5. **Not yet built**: a production `Dockerfile` for the Next.js app (multi-stage build) — currently
   only `docker-compose.yml` exists, and that's for the *local dev* Postgres container only, not for
   running the app itself in production. Needed regardless of which app host is chosen, unless the
   chosen platform builds directly from source without a Dockerfile (e.g. Vercel-style).
6. Run `npx prisma migrate deploy` (production-safe migration apply, not `migrate dev`) against the
   real `DATABASE_URL` to create the schema.
7. Seed at minimum one admin user (`npm run db:seed -- <email> <password> <name>`) — no self-signup
   flow exists.
8. **Verify against the real resources before trusting it** — this codebase has never been tested
   against a real Postgres host or real Azure Storage, only Docker Postgres + Azurite locally. Run
   the full manual smoke path at minimum: log in, create a Site, clone a Master Scenario, create a
   Run, Pass/Fail a scenario, upload an Evidence image, confirm it round-trips (upload → visible
   thumbnail → lightbox → the underlying blob is actually reachable, not just a local-emulator URL
   that happens to resolve). `npm run test:e2e` itself is not meant to run against production — it's
   scoped to the local dev server + Docker + Azurite (see `e2e/playwright.config.ts`'s `webServer`).

## Verification

Not applicable until this is picked up — nothing to verify locally, since local dev/test
deliberately keeps using Docker Postgres + Azurite regardless of what production ends up using.
