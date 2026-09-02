# REQ-024: Environment Catalog CRUD

**Status:** ✅ Done
**Priority:** P2

## Context

Originally titled "Environment / Data Chain Field Schema CRUD" — both `ENVIRONMENTS` and
`DATA_CHAIN_FIELDS` in `web/lib/config.ts` were assumed to be the same kind of thing (static config
that just needed moving into the DB, deferred at REQ-019 time). Checking the actual code (2026-09-02)
found that assumption was false for half of it:

- **`ENVIRONMENTS`** — a real, live string list, consumed in 3 places (New Run form, Run Edit form,
  Run History filter). A genuine, low-risk CRUD candidate.
- **`DATA_CHAIN_FIELDS`** — **dead code**, never imported anywhere. The real HN/VN/AN/Bill No. fields
  are hardcoded fixed columns on the `Run` Prisma model, not driven by this config at all. Turning
  these into a true dynamic schema is a different-order architecture change (new field storage
  model, ripples through Run creation/editing/reporting), not a config-to-DB move.

**Split 2026-09-02**: rescoped this REQ down to Environment Catalog only. The Data Chain half is
tracked separately at [REQ-037](REQ-037_site_configurable_data_chain_schema.md) as an unscoped
backlog item pending BA/SA input (business justification, schema/query impact, audit/snapshot
boundary — see that file), so it doesn't block this low-risk piece.

## Design

New Prisma model `Environment { id (cuid), name, orderIndex, active }` — `id` is an opaque internal
identifier (never shown to users/reports, unlike REQ-032's running-number ids which carry real
business meaning). `name` is copied verbatim into `Run.environment` (plain `String`, no FK) at Run
creation, same denormalized-snapshot convention already used for `suiteNamesJson`/
`tagIncludeNamesJson` — renaming a catalog entry later never retroactively changes what an
already-created Run displays. `orderIndex` preserves the intentional STAGING → UAT → DEV → PRE-PROD
→ PROD order (not alphabetical).

Soft-deactivate (matches `Site`/`User`'s `active` convention), hard-delete only when unused
(`EnvironmentInUseError` guard mirrors `deleteSite()`'s `SiteHasRunsError` exactly — counts `Run`
rows with that `environment` value, blocks if any exist).

## Implementation

- `prisma/schema.prisma`: new `Environment` model, migration `20260902040119_req024_environment_catalog`
- `lib/db/environments-table.ts` (new): `listEnvironments`, `getEnvironment`, `createEnvironment`
  (assigns `orderIndex = max+1`), `updateEnvironmentName`, `updateEnvironmentActive`,
  `deleteEnvironment` (+ `EnvironmentInUseError`) — mirrors `lib/db/sites-table.ts` file-for-file
- `app/admin/environments/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx` (new) — mirror
  `app/admin/sites/*` exactly (list with toggle-active + Edit/Delete, single-field create/edit form,
  no `id` input since system-generated)
- `app/TopNav.tsx`: "Manage Environments" added to the `canEdit` block's `manageLinks`
- 3 consumer migrations from the static `ENVIRONMENTS` import to a DB read:
  - `app/[site]/new/page.tsx`: `listEnvironments()` (active only — picking a *new* value)
  - `app/[site]/[runId]/edit/page.tsx`: `listEnvironments({ includeInactive: true })` — a Run
    created under a since-deactivated Environment must still show its actual value as a selectable
    option in its own edit form, or the `<select>`'s `defaultValue` would silently fall back to
    whatever option happens to render first
  - `app/[site]/page.tsx` + `RunHistoryList.tsx`: Server Component fetches
    `listEnvironments({ includeInactive: true })` (again, for ordering historical values sensibly,
    not just active ones) and passes the name list down as a new `environmentOrder` prop; the
    client component's existing "seed-then-alphabetical-append" logic against *runs actually
    loaded* is otherwise unchanged — that part was always correctly scoped to "what values exist in
    this filtered list," not "every catalog entry"
- `lib/config.ts`: `ENVIRONMENTS` removed (not left as a dead stub); rewrote the stale file-header
  comment while there (referenced a rotating plan file and pre-REQ-029 Azure Table Storage, both
  no longer accurate); `DATA_CHAIN_FIELDS` left untouched, now with a comment pointing to REQ-037
- Seed: `npm run db:migrate` (schema-only) then the 5 original values seeded through the real
  `createEnvironment()` function via a one-off `temp_scripts/_seed_environments.ts` (not committed,
  `_`-prefixed throwaway convention) — not a raw SQL bypass, so `orderIndex` assignment behaves
  exactly like every future admin-created row

## Verification Log

- [x] `npm run build` clean
- [x] `npm run test:e2e` 27/27 — zero visible behavior change for the 5 pre-existing values,
  confirmed (New Run form, Run Edit form, Run History filter specs all pass unchanged)
- [x] Direct Postgres check: 5 seeded rows, `orderIndex` 0-4 in the correct STAGING→PROD order
- [x] Manual Puppeteer (13-point checklist on the shared E2E site, cleaned up after): list shows
  all 5 seeded rows; created "SANDBOX" → appears in New Run picker at the end of the order;
  created a Run under STAGING; deactivated STAGING → disappears from the New Run picker but the
  already-created Run's Edit page still shows/offers STAGING correctly (screenshot); attempted to
  delete in-use STAGING → blocked with the correct error; deleted unused SANDBOX → confirmed via
  direct Postgres check (exactly 5 rows remain, no orphan) after a false-negative in the
  verification script's own text-match assertion — didn't take the script's result at face value,
  cross-checked the DB directly before concluding it actually worked; reactivated STAGING to
  restore original state (final screenshot confirms clean 5-row end state).
