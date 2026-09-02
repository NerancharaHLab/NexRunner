# REQ-039: Suite Management Enhancements (Search, Site Scoping & Scenario Picker Ergonomics)

**Status:** 🔲 Spec finalized, not yet implemented (going through `EnterPlanMode` next)
**Priority:** P2

## Context

`Suite` has no site attribution at all today (`id, suiteId, name, description, scenarioIds` only).
Confirmed against the real DB: all 5 existing Suites are genuinely site-specific by name
(`NUH Core Smoke Test`, `OPD Journey`, `IPD Full Lifecycle`, `NUH Smoke Test v2.7.0` → NUH;
`E2E flow for TMH v2.7.0` → TMH) but nothing in the data model captures that — users have to read
and remember the name. Separately, both the New Run page's Suite picker (`listSuites()`, no
filtering) and the Add/Edit Suite form's Scenario picker (`id — name` only, Master Library scenarios
only, no Flow/Critical/Steps/Criteria context) are real, confirmed gaps.

User supplied a full SRS across several rounds; each round was verified against the real codebase
before accepting, catching 2 real corrections along the way:

1. **`deleteSuite()` has zero usage-guard today** (confirmed — no check at all, unlike Site/Tag/
   Environment which all guard or warn). Not something the SRS's first draft mentioned; raised and
   folded into the final spec.
2. **The SRS's first draft claimed a "Steps/Criteria expandable card" component already exists on
   the Run page to reuse** — confirmed via `grep` that `ScenarioBoard.tsx`, `LinearReportModal.tsx`,
   and the Executive Report **never render `steps`/`criteria` anywhere in this app**. Corrected:
   this is genuinely new UI (`ScenarioExpandableRow`), not a reuse of anything existing. Only the
   *outer* shell (Accordion grouped by Flow, group-header select-all, search) is a real reuse from
   [REQ-038](REQ-038_master_scenario_grouping_batch_select.md).

Everything else in the SRS below was verified accurate on the first pass (the 5 Suite names' real
site attribution matched the SRS's guess exactly; `Run.suiteIds`/`suiteNames` are already native
Postgres `text[]` columns, confirmed usable for the usage-count guard with no new query mechanism
needed).

## Decisions (confirmed, final)

1. **Schema**: `Suite.siteId String?` — nullable (Global suites), and (implementation decision,
   not explicitly specified by the SRS, reasoning recorded here for visibility): a **real FK** to
   `Site.id` (`site Site? @relation(fields: [siteId], references: [id])`), not a free-text field
   like `Scenario.sourceSite` (REQ-036). Different from `sourceSite`'s reasoning: `sourceSite` is
   deliberately allowed to reference a not-yet-provisioned hospital name; `Suite.siteId` gates which
   *real, currently provisioned* Site's Custom Scenarios are offered in the picker, so a typo'd/
   non-existent site here would be a real bug, not a legitimate case. No `onDelete` override — a
   Site with Suites still attached can't be deleted (default Postgres `RESTRICT`), consistent with
   this app's "never silently orphan/lose a reference" precedent (matches `deleteSite()`'s existing
   `SiteHasRunsError` guard in spirit).
2. **Backfill** (one-time, via `docker exec ... psql`, not a committed script — same precedent as
   REQ-036's backfill): `SUT-0003/0004/0005/0006 → 'NUH'`, `SUT-0007 → 'TMH'`. Confirmed against
   real data, no Global suites exist today.
3. **Suite names**: preserved as-is, no rename/prefix-stripping migration. The "no hospital-prefix
   needed" guidance applies only to new Suites created after this ships (a placeholder hint on the
   create form, not a rule enforced anywhere).
4. **Delete guard**: soft warning only, never a hard block (Run snapshots scenario content/scope
   independently of Suite's continued existence — REQ-030/031's own protection already covers
   this). Usage count via `prisma.run.count({ where: { suiteIds: { has: suiteId } } })` (or a
   `getSuiteUsageCounts()` helper precomputed for the whole list, mirroring
   `getTagUsageCounts()`'s existing shape). Confirm modal: plain wording when count is 0; an orange
   warning card with the exact count when count > 0, but the Delete button always remains available
   either way.
5. **Scenario source scoping**: Global Suite → Master Library scenarios (`MST-xxxx`) only. Site-scoped
   Suite → Master + that Site's own Custom Scenarios (`{SITE}-CUST-xxxx`), each row carrying a
   `[Master]`/`[{SITE} Custom]` scope badge for transparency. Changing the Target Site dropdown in
   the form re-scopes the picker's available scenarios live.
6. **Scenario Picker UI** — outer shell reused from REQ-038's `useScenarioGrouping` hook (Flow
   accordion, group-header select-all/indeterminate, search with auto-expand). New
   `ScenarioExpandableRow` component per scenario: header bar (checkbox, id, scope badge, critical
   badge, name, role, a "▾ View Steps & Criteria" toggle), collapsed by default, expanding to two
   side-by-side boxes (Steps: light-grey card; Criteria: light-green card, both `white-space:
   pre-line` to preserve the numbered-list line breaks already used throughout this app's
   steps/criteria text).
7. **Manage Suites list page**: search (name + description, client-side real-time) + Filter-by-Site
   dropdown (All Sites / each real Site / Global), Site badge + Flow/Critical breakdown per card —
   same "Server Component fetches, Client Component does search/filter locally" architecture as
   REQ-025's `RunHistoryList`/REQ-038's `MasterScenarioLibraryList`.
8. **New Run page's Suite picker gets the actual pay-off of this whole REQ** (this was the original
   business complaint that started the conversation): `app/[site]/new/page.tsx` currently calls
   `listSuites()` completely unfiltered, so a Run being created for NUH offers TMH's Suites too.
   Once `siteId` exists, that call becomes "this Site's own Suites + Global (`siteId === null`)
   ones" — confirmed as in-scope for this REQ, not a separate follow-up, since it's the actual
   reason `siteId` was requested in the first place.

## Design notes for implementation (non-binding detail, refined during `EnterPlanMode`)

- `lib/db/test-suites-table.ts`: add `siteId` to `SuiteDef`/`SuiteInput`/`rowToDef`, add
  `getSuiteUsageCounts()` (mirrors `getTagUsageCounts()`'s shape: one query, tallied in JS, small
  scale). `deleteSuite()` itself stays a plain delete — the guard is UI-level (confirm modal), not
  a thrown error, since deletion is never actually blocked.
- Admin Suites list (`app/admin/suites/page.tsx` + a new Client Component) needs each Suite's
  scenario-count/critical-count/flow-breakdown precomputed server-side (reading `scenarioIds` against
  the live Scenario table, same live-join the list already implicitly relies on today).
- Add/Edit Suite form: Target Site `<select>` populated from `listSites()`. Scenario picker needs
  Master scenarios **and every Site's Custom scenarios** available to filter client-side when the
  Target Site changes — pre-fetch all of it server-side (small scale today) rather than adding a new
  API route for a live re-fetch on dropdown change.
- `data-testid`s follow the `datatest-id-standard` skill, reusing `admin-suite-form`/`admin-suites`
  component-name conventions already established on these two pages.
- `lib/db/test-suites-table.ts`'s `listSuites()` gets an optional `{ forSite?: string }` param —
  when given, returns only Suites where `siteId === forSite OR siteId IS NULL` (that Site's own +
  Global); when omitted (every existing call site — the Suite CRUD pages themselves, which need
  every Suite regardless of scope), behaves exactly as it does today, unfiltered. Only
  `app/[site]/new/page.tsx` passes `{ forSite: site }`.

## Verification plan (once implemented)

- [ ] `npm run build` clean; `npm run test:e2e` 27/27 (no existing spec touches `/admin/suites*`,
  confirmed — regression check only).
- [ ] Direct Postgres check: all 5 existing Suites correctly backfilled (`NUH` ×4, `TMH` ×1).
- [ ] Manual Puppeteer: search + Filter-by-Site on the list page; Site badge + Critical/Flow counts
  correct per card; delete-guard shows the right warning text/count for an in-use Suite vs. a plain
  confirm for an unused one, and both paths still actually delete on confirm; creating/editing a
  Suite with Target Site = a real Site shows that Site's Custom Scenarios in the picker (with the
  right scope badge) in addition to Master, while Target Site = Global shows Master only; group-header
  select-all + indeterminate state on the picker; a scenario row's "View Steps & Criteria" toggle
  expands/collapses correctly and preserves line breaks; New Run's Suite picker (separate page,
  `/[site]/new`) now only offers that Site's own Suites + Global ones — confirm this cross-cutting
  change explicitly, not just the Suite CRUD pages themselves.
- [ ] Clean up all test data created during verification.
