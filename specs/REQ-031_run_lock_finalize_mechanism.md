# REQ-031: Add Run Lock / Finalize Mechanism

**Status:** 🔲 Not started (backlog)
**Priority:** P2 (Feature — Compliance / Non-Repudiation)

## Context

Same BA/Compliance review as [REQ-030](REQ-030_scenario_result_full_snapshot.md) (2026-09-01).
Confirmed by reading the code: a `Run` has **no locked/finalized state at all**. Both
`updateRunMetadata()` (Environment/Test Cycle/Date/Version/Delivery Batch/HN/VN/AN/Bill, via the
Run Edit page, admin/qa_lead) and `updateScenarioResult()`/`addEvidence()`/`removeEvidence()`
(status/notes/evidence, via the Scenario Board) remain callable indefinitely — including after the
Gate Result reaches READY, after a Linear Report has been sent, or after an Executive Report has
been generated and presumably signed off on.

This is a **Non-Repudiation** gap: nothing stops a Pass from being silently flipped to Fail (or vice
versa) after the fact, which undermines the evidentiary value of the Gate Result / sign-off record
the reporting features exist to produce.

## Proposed Fix (not yet designed in detail — this file records the intent, not a spec)

Add a `LOCKED`/`FINALIZED` state to `Run` (likely a boolean + `finalizedAt`/`finalizedBy`, mirroring
the `active` boolean pattern already used on `Site`/`User`) that, once set, blocks
`updateRunMetadata()` and `updateScenarioResult()`/`addEvidence()`/`removeEvidence()` at the
`lib/runs.ts` layer (not just hidden in the UI — same defense-in-depth precedent as `createRun()`'s
inactive-site check).

Open design questions for whoever picks this up:
- Who can lock a Run, and when — manual action by admin/qa_lead once Gate reaches READY? Automatic
  on first "Send Summary to Linear" / Executive Report generation? Some combination?
- Is locking reversible (admin-only "unlock" escape hatch for genuine correction requests) or
  strictly one-way? A regulated-QA context usually wants an audit-logged unlock, not "impossible to
  ever fix a mistake."
- UI: what does a locked Run's Scenario Board look like — read-only Pass/Fail buttons, a visible
  "🔒 Locked" badge, disabled Attach Image?
- Interaction with [REQ-030](REQ-030_scenario_result_full_snapshot.md): natural to ship together
  (both are about making a completed Run's record trustworthy), but each is independently useful —
  REQ-030 fixes content drift even without locking; this REQ fixes editability even without content
  snapshots. No hard dependency either direction.

## Verification (once implemented)

- [ ] Locking a Run blocks `updateRunMetadata()` at the server-action/API layer, not just the UI
  (verify via direct POST, not just "the button is hidden").
- [ ] Locking a Run blocks `updateScenarioResult()`/`addEvidence()`/`removeEvidence()` the same way.
- [ ] Existing E2E suite still 24/24 for the normal (never-locked) path.
