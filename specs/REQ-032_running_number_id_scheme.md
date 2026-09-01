# REQ-032: System-generated Running Number ID Scheme

**Status:** 🔲 Not started (spec finalized, ready to implement)
**Priority:** P1 (Data Integrity — ties directly into [REQ-030](REQ-030_scenario_result_full_snapshot.md)/[REQ-031](REQ-031_run_lock_finalize_mechanism.md)'s audit-trail/non-repudiation concerns)

## Context

BA review (2026-09-01, same session as REQ-030/031) of how IDs are assigned today: every entity's
`id` is free text the user types by hand (Master Scenario `SC-01`, Suite `SMOKE-OPD`) or a
free-text field pre-filled with a suggestion the user can still overwrite (Run ID —
`suggestNextRunId()` returns `${siteKey}-RUN-${seq}`, but the form input remains a plain editable
text box). Iterated through several rounds to a final ID scheme, fully confirmed:

| Entity | Creation entry point | New ID format | Scope / reset |
|---|---|---|---|
| Master Scenario | `/admin/master-scenarios/new` ("+ Add Scenario") | `MST-0001` | Global, never reset |
| Suite | `/admin/suites/new` ("+ Add Suite") | `SUT-0001` | Global, never reset |
| Cloned Scenario (Site) | `/admin/scenarios/[site]/clone-from-master` | **unchanged** — keeps the Master's `MST-xxxx` id verbatim | n/a (not a new id) |
| Custom Scenario (Site) | `/admin/scenarios/[site]/new` ("+ Add Scenario") | `{SITE}-CUST-0001` | Per-site, never reset |
| Test Run | `/[site]/new` | `RUN-{SITE}-0001` | Per-site, never reset |

### Decisions made along the way (and why)

- **No Domain/flow embedded in the ID** (e.g. rejected `MST-OPD-0001`) — `flow` is an editable field;
  embedding it in an immutable id risks the id silently lying about the scenario's current flow
  after someone edits it later.
- **Suite id doesn't encode its member Scenario ids** — membership already lives in
  `Suite.scenarioIds`; encoding it in the id string too would need to change every time membership
  changes, which an id must never do.
- **Clone keeps the Master id unchanged** — "snapshot" here means the *content* is copied
  independently (already true, see REQ-030's finding that content actually isn't fully snapshotted
  yet), not that the id gets rewritten. Rewriting it would require a separate back-reference field
  to preserve traceability to the source Master scenario, which is out of scope here.
- **Run ID: rejected `RUN-{SITE}-{YYYYMM}-0001` with monthly reset.** Real QA run cadence follows
  Cycle/Sprint/Release, not the calendar — a monthly reset would produce repeated `0001`s in slow
  months and duplicates the job the existing `testCycle` free-text field already does. Settled on
  **`RUN-{SITE}-0001`, sequential, never reset.**
- **Legacy data is NOT reformatted.** Existing rows (whatever free-text id or old `{SITE}-RUN-{seq}`
  format they have) stay exactly as they are — links, reports, and prior references must not break.
  The new format applies only to records created after this ships. The "next number" query only
  needs to consider rows matching the *new* pattern for a given prefix; anything else is ignored for
  sequencing purposes (an old free-text Scenario id doesn't consume a `MST-` slot).
- **Strictly system-generated, not just auto-suggested.** This is the biggest behavioral change from
  today's Run ID: the id field becomes **read-only in the UI**, and the **server action must reject
  (or simply ignore) any client-supplied id/sequence value** — the sequence is assigned server-side
  at save time. Rationale: an editable "suggestion" can't guarantee no gaps/collisions, which
  undermines the entire point of a Running Number as a trustworthy, audit-friendly identifier (ties
  directly to REQ-031's non-repudiation concern).
- **Root cause of why users used to override the Run ID field, and its real fix**: investigated why
  free-text override was wanted at all — it was being used to *label* a run's purpose (e.g.
  `RUN-EMERGENCY-VN-FIX`, `RUN-PRE-GO-LIVE`), not to control sequencing. The correct fix is to give
  Run a dedicated **`name`/title field** (new — `Scenario` and `Suite` already have a `name` field
  today; only `Run` is missing one) for that free-text purpose, fully separate from the
  system-generated id. `testCycle` (existing) continues to cover "which round/cycle", `name` (new)
  covers "what's this run for, in the tester's own words".

## Scope of implementation

1. **Prisma schema**: add `Run.name String` (new, required or default `""`, TBD at implementation
   time). No schema change needed for Scenario/Suite (`name` already exists) — only their id
   *generation* logic changes.
2. **Sequence generation — must be race-safe.** Naive "read max, +1, write" (today's
   `suggestNextRunId()` pattern) has a real race window under concurrent submits. Needs a proper
   atomic mechanism — candidates to evaluate at implementation time: Postgres `SERIAL`/`IDENTITY`
   counter table per prefix-scope, or a `SELECT ... FOR UPDATE` on a dedicated sequence-tracking
   row, one counter per (prefix) for global ones and per (prefix, siteKey) for per-site ones.
3. **Server actions**: `createRun()`, `createScenario()` (Master + Site-custom paths), `createSuite()`
   must generate the id server-side and must not trust a client-supplied id for these four creation
   paths. (Clone keeps using the source id as today — no id generation there.)
4. **UI**: the id input on the 4 creation forms becomes read-only/disabled, showing either the
   pre-assigned next value as a preview or a placeholder like `Auto-assigned on save: RUN-BKK-xxxx`.
   New Run form gains a `name`/title text input (editable, replaces what free-typing the id used to
   informally serve).
5. **E2E**: specs that currently type a custom Run ID (`e2e/helpers/run.ts`'s `createRunViaUI`,
   `e2e/tests/03-new-run.spec.ts`'s duplicate-id test, etc.) need rework — duplicate-id rejection
   either no longer applies (system can't collide with itself) or needs a different test angle;
   anywhere a custom label was being set via the id field moves to the new `name` field instead.

## Open implementation questions (for the plan, not yet decided)

- Exact sequence-storage mechanism (see point 2) — needs picking one concrete approach.
- `Run.name` — required at creation or optional/defaultable?
- Whether the "next id" preview shown pre-save is guaranteed to match what's actually assigned
  (only if generation happens at render time under the same lock) or is explicitly labeled as
  indicative-only (simpler, avoids holding a lock across a full page render).

## Verification (once implemented)

- [ ] Concurrent Run creation (2 simultaneous submits, same site) never produces a duplicate or
  skipped sequence number.
- [ ] Directly POSTing a custom `id`/`runNo` to the creation server actions has no effect — server
  always assigns its own.
- [ ] Legacy rows (pre-existing ids) are untouched and still resolve correctly; new "next number"
  queries don't get confused by them.
- [ ] `npm run build` clean, `npm run test:e2e` 24/24 (after E2E updates described above), manual
  Puppeteer pass creating several Runs/Scenarios/Suites in a row confirming strictly sequential,
  gap-free numbering per scope.
