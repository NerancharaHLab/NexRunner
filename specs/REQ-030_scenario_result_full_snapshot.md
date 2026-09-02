# REQ-030: Refactor ScenarioResult to Store a Full Content Snapshot

**Status:** ✅ Done
**Priority:** P1 (Critical — Data Integrity / Compliance)

## Context

BA/Compliance review of the Master → Site → Run data model (2026-09-01, this session) found that
`ScenarioResult` does **not** actually snapshot the Scenario it was tested against. It stores only
`scenarioId, status, notes, evidence` (+ a `critical` field that's written but never read back — see
below). `getRunDetail()` in `lib/runs.ts` always joins against the Site's **current, live** Scenario
row (`getScenariosForSite()`) to render name/steps/desc/criteria/flow for a Run — not a value
captured at the time the Run/result was created.

**Confirmed failure scenario** (verified by reading the code, not assumed):
- Admin edits a Site's cloned Scenario's Steps/Criteria (or Master's, then re-clones) *after* a Run
  has already recorded a Pass/Fail against it.
- Opening that old Run shows the **new** Steps/Criteria text, not what the tester actually followed.
- If the Scenario is deleted from the Site entirely, it silently disappears from the old Run's
  scenario list — `scopeScenarios()` filters the snapshotted `scenarioIds` against the site's
  *current* scenario list, so a deleted one just isn't there anymore. No trace kept.

This is a **Temporal Inconsistency / Repudiation** problem: a completed test record's content can
change retroactively without anyone editing the Run itself. For a system whose Data Chain fields
(HN/VN/AN/Bill No.) tie test evidence to real hospital transactions, and whose Executive
Report/Linear Report exist specifically to produce a defensible sign-off record, this conflicts with
standard Computer System Validation practice (CSV/GAMP5): a test execution record must reflect
exactly what was executed against, permanently.

**Also found, minor**: `ScenarioResultEntity.critical` is written on every upsert (copied from
`scenarioDef.critical` at write time) and faithfully read back by `lib/db/tables.ts`, but
`getRunDetail()`'s `{...def, status, notes, evidence}` spread never uses it — every actual read of
"is this scenario critical" (Scenario Board's badge, Executive Report's critical matrix, gate
computation via `computeGateResult()`) uses the *live* scenario def's `critical` instead. Folding it
into the snapshot fix below makes it live data instead of removing it.

## Decisions (confirmed, implemented — shipped together with [REQ-031](REQ-031_run_lock_finalize_mechanism.md) per user instruction)

1. **Snapshot written eagerly, at `createRun()` time** — one `ScenarioResult` row per scoped
   scenario is created immediately when the Run is created (`status: "notrun"`, content
   snapshotted), not lazily on first Pass/Fail. Only this covers scenarios that end up never
   touched — "Not Run" is still a real, displayable historical fact and needs a snapshot too.
2. **No backfill of pre-existing `ScenarioResult` rows.** Backfilling from current live Scenario
   data would silently fabricate a "snapshot" that's really just today's (possibly already-drifted)
   content passed off as what was tested at the time. Old rows keep falling back to a live join
   exactly as before this REQ; only Runs created from now on get the full guarantee.
3. **Snapshot fields, at minimum + one addition**: `name, steps, criteria, desc, flow, critical` per
   the original spec, **plus `role`** (not in the original minimum list, but the Scenario Board
   does render `sc.role` — leaving it out would leave one displayed field still silently mutable
   after the fact, defeating half the point).
4. **A second, related bug fixed in the same pass**: `createRun()` previously only snapshotted
   `scenarioIdsJson` (the covered scenario *id set*) when a Suite/Tag filter was used — an unscoped
   Run had no snapshot at all and fell back to "whatever the site's Scenario table currently has."
   That's the same live-join problem one level up (Scenario *membership*, not just content) — a
   deleted Scenario would silently vanish from every historical unscoped Run, including ones where
   it was tested and passed. Fixed by **always** snapshotting `scenarioIdsJson` at `createRun()`,
   for every Run regardless of Suite/Tag filtering.

## Implementation

- `prisma/schema.prisma`: `ScenarioResult` gains 6 nullable columns — `name, desc, role, flow,
  steps, criteria` (all `String?`). Nullable = old rows simply have none; no migration-time
  backfill.
- `lib/types.ts`: `ScenarioResultEntity` gets the matching 6 optional fields.
  `computeGateResult()`'s param type loosened from `scenarios: ScenarioDef[]` to
  `scenarios: { id: string; critical: boolean }[]` — it only ever reads `.critical`, so this lets
  the gate recompute run entirely off `ScenarioResult` rows without any live Scenario join.
- `lib/db/tables.ts`: `resultRowToEntity`/`upsertScenarioResult` thread the 6 new columns through
  (`null` ↔ `undefined`, matching the file's existing convention).
- `lib/runs.ts`:
  - New shared helper `resolveRunScenarios(siteKey, run, results)` — the single place that decides
    "prefer the Run's own snapshot; fall back to a live Scenario join only for ids whose result row
    has no snapshot" (i.e. only pre-REQ-030 Runs/rows). Used by both `getRunDetail()` (rendering)
    and `updateScenarioResult()` (aggregate/gate recompute), so this rule exists in exactly one
    place.
  - `createRun()`: always sets `scenarioIdsJson`; after `upsertRun()`, eagerly `upsertScenarioResult()`s
    one row per scoped scenario with the full 6-field snapshot + `status: "notrun"`.
  - `updateScenarioResult()`/`addEvidence()`/`removeEvidence()`: spread `...(previous ?? {})` before
    overriding status/notes/evidence, so a snapshot already on the row survives a partial update
    instead of being nulled out.

## Verification Log

- [x] `npm run build` clean
- [x] `npm run test:e2e` 27/27 (24 baseline + 3 added concurrently by another session for REQ-025,
  unrelated to this REQ — confirmed compatible)
- [x] Direct Postgres check: new Run → every scoped scenario has a `ScenarioResult` row immediately,
  `status='notrun'`, snapshot columns populated from the scenario as of that moment.
- [x] Manual Puppeteer: created a Run, then edited the underlying Scenario's Steps — the Run's Board
  still showed the original scenario content. Deleted the Scenario entirely — it still appeared on
  that Run's Board (from its snapshot), confirmed via page text check.
- [x] Confirmed old (pre-REQ-030) Runs are unaffected — still live-join exactly as before, no visible
  regression (existing E2E suite covers this path).
