# Test Runner — DevOps Handoff (Production Deploy)

Prepared 2026-09-03 to hand off provisioning + deploy of the Test Runner app. See
[`specs/REQ-027_provision_azure_deploy.md`](../specs/REQ-027_provision_azure_deploy.md) for the
still-open decisions (app hosting platform, exact schema name). This document covers everything
already confirmed: the database placement, required env vars, migration/seed commands, and the
production `Dockerfile`.

## 1. Database: a new schema inside the existing `dev_cortex` database

Confirmed with the app owner: Test Runner does **not** get its own separate Postgres database. It
gets a **new schema inside the existing `dev_cortex` database** (the real Cortex/HIS system's DB),
as a sibling of the schemas already there (`ehr`, `hivent`, `user_management`, `ext`, `pgmq`,
`pooler`, `paradedb`, `pdb`, `public`, ...) — same instance, same database, its own namespace.

- **Suggested schema name**: `test_runner` — a placeholder. Rename freely; nothing in the app
  hardcodes it (the schema name lives entirely in `DATABASE_URL`'s `?schema=` parameter, read at
  runtime — see §2).
- **Permissions needed**: the app needs to **create its own tables** in that schema (via
  `prisma migrate deploy`, §3) and continuously **read + write** rows in them (Users, Sites,
  Scenarios, Suites, Tags, Runs, ScenarioResults, RunLockEvents, IdSequence). A read-only role (the
  screenshot shared during scoping showed a `dev_cortex_readonly` connection) is **not sufficient**
  — the app has no read-only mode. It needs a role with `CREATE`/`SELECT`/`INSERT`/`UPDATE`/`DELETE`
  scoped to its own schema; it does not need any access to the other schemas in `dev_cortex` (`ehr`,
  `hivent`, etc.) — the app only ever queries its own tables.
- **Region/tier**: whatever `dev_cortex`'s own instance already is (the connection shown was on an
  Azure Database for PostgreSQL instance in the southeast-asia region) — Test Runner doesn't need
  anything different from what's already provisioned for that database.

## 2. Required environment variables

Source of truth: [`web/.env.local.example`](../web/.env.local.example) (the dev-time version of
these same 3 variables).

| Variable | Production value |
|---|---|
| `DATABASE_URL` | Real Postgres connection string, **must end in `?schema=<the schema name from §1>`** (e.g. `?schema=test_runner`) — this is the exact mechanism that scopes every query to that schema and nothing else in `dev_cortex`. Same query-param convention the local dev URL already uses with `?schema=public`. |
| `AZURE_STORAGE_CONNECTION_STRING` | A real Azure Storage Account (Blob) connection string — replaces the local Azurite emulator used in dev. Evidence images (screenshots attached to test results) are stored here, nothing else. |
| `AUTH_SECRET` | A fresh secret generated with `openssl rand -base64 32`. **Never reuse the value committed in `.env.local.example`** — that value is a known dev-only secret. Signs the login session JWT. |

No other environment variables are required. `PORT` defaults to `3000` (see the `Dockerfile`).

## 3. One-time setup commands (run once, before the app serves any traffic)

Both commands need `DATABASE_URL` (and, for seed, nothing else) set in the environment they run in.

```bash
# 1. Create the schema's tables (production-safe — never use `prisma migrate dev` here)
npx prisma migrate deploy

# 2. Seed at least one admin user — there is no self-signup flow
npm run db:seed -- <email> <password> <display name>
```

Both can be run from a full checkout with `npm ci` done first, or from the `migrator` Docker build
target described in §4 below. **Do not** run `prisma migrate deploy` automatically on every
container start if running more than one replica — it's a one-off step, not part of the app's own
startup, specifically to avoid a migration race between replicas starting simultaneously.

## 4. Production Docker image

[`web/Dockerfile`](../web/Dockerfile) — multi-stage build, two targets:

- **`runner`** (default target) — the actual running app. Small image: only `.next/standalone`
  output, static assets, and `public/`. Runs as a non-root user, `node server.js` on port 3000, and
  needs exactly the 3 env vars from §2 at runtime. Has no Prisma CLI in it at all — the running app
  only ever uses `@prisma/client` (via the `@prisma/adapter-pg` driver adapter over a plain `pg`
  connection), never the CLI.
- **`migrator`** — a separate, larger image with the full toolchain, whose only purpose is running
  the one-off `npx prisma migrate deploy` command from §3. Build with `--target migrator`. (An
  earlier attempt to make the slim `runner` image also able to run the Prisma CLI, via a hand-picked
  partial copy of `node_modules/prisma`, was tried and confirmed broken — `MODULE_NOT_FOUND` on a
  transitive dependency the partial copy missed — hence the separate full-toolchain target instead
  of trying to slim it down further.)

```bash
cd web
docker build -t test-runner .                          # the app itself
docker build --target migrator -t test-runner-migrate .  # one-off migration runner
docker run --rm -e DATABASE_URL="..." test-runner-migrate
docker run -d -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e AZURE_STORAGE_CONNECTION_STRING="..." \
  -e AUTH_SECRET="..." \
  test-runner
```

**Verified locally as of 2026-09-03** (real containers, real network calls — not just a build check):
both `docker build` targets complete successfully; the `migrator` image, run against the real local
Postgres over the network with a scratch `?schema=docker_verify_test` connection string (same
`?schema=` mechanism §1/§2 describe), applied all 6 real migrations successfully end to end; the
`runner` image, booted the same way and pointed at that migrated schema, served a real `200` on
`/login` over a real published port. Both scratch resources (the schema, the seeded test user) were
torn down after. This derisks the exact deploy pattern `dev_cortex` will use — a per-service schema
inside a shared database — as far as it's possible to without the real credentials. See §5 for what
is still genuinely unverified (the real `dev_cortex` connection itself, real Azure Storage).

## 5. What is NOT verified yet — do this before trusting a real deploy

This codebase has **never** been run against a real Postgres host or real Azure Storage Account —
only Docker Postgres + the Azurite emulator, locally. Before trusting a production deploy:

1. Run the two one-time setup commands from §3 against the real `dev_cortex`/new-schema connection.
2. Run a full manual smoke pass against the real running app: log in (with the seeded admin user),
   create a Site, clone a Master Scenario into it, create a Run, Pass/Fail a Scenario, upload an
   Evidence image and confirm it actually round-trips (visible thumbnail → lightbox → the underlying
   blob URL is genuinely reachable, not a local-emulator URL that happens to still resolve).
3. `npm run test:e2e` is **not** meant to run against this production setup — it's hard-scoped to
   the local dev server + Docker Postgres + Azurite (see `web/e2e/playwright.config.ts`'s
   `webServer` block). Don't point it at production.
