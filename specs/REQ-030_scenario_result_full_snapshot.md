# REQ-030: Refactor ScenarioResult to Store a Full Content Snapshot

**Status:** 🔲 Not started (backlog)
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
computation via `computeGateResult()`) uses the *live* scenario def's `critical` instead. This field
is effectively dead — folding it into the snapshot fix below makes it live data instead of removing
it, since "was this critical at the time" is exactly the kind of thing that should be preserved.

## Proposed Fix (not yet designed in detail — this file records the problem + backlog intent)

Store a real snapshot of the tested-against content on `ScenarioResult` at the moment each
scenario enters a Run's scope (likely at `createRun()` time, one row per scoped scenario, rather
than lazily on first PATCH) — at minimum: `name, steps, criteria, desc, flow, critical`. Reads
(`getRunDetail()`, reports) should use the snapshot instead of re-joining the live Scenario table.

Open design questions for whoever picks this up:
- Snapshot written at `createRun()` (one row per scoped scenario immediately) vs. lazily on first
  `updateScenarioResult()`/`addEvidence()` call for that scenario (current code only creates a
  `ScenarioResult` row on first interaction, not at Run creation) — affects whether an untouched
  "Not Run" scenario has a snapshot at all.
- Whether Master Scenario Library edits should also be blocked from silently propagating into
  already-cloned Site copies (separate from this — cloning is already a snapshot, this REQ is only
  about Run ↔ Scenario, not Master ↔ Site).
- Migration of already-existing `ScenarioResult` rows (post-REQ-029, on Postgres) — none have a
  snapshot; decide whether to backfill from current live Scenario data (best-effort, inherently
  imperfect for old rows) or accept that only Runs created after this ships get real integrity.

## Verification (once implemented)

- [ ] Edit a Site Scenario's Steps after a Run already recorded a result against it → the old Run's
  displayed Steps must NOT change.
- [ ] Delete a Site Scenario after a Run recorded a result against it → the old Run must still show
  the scenario (from its snapshot), not silently drop it.
- [ ] Existing E2E suite still 24/24 (no behavior change for the normal, non-retroactive-edit path).
