# REQ-031: Add Run Lock / Finalize Mechanism

**Status:** ✅ Done
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

## Decisions (confirmed via user answers + one round of reflected-back clarification)

Asked the user two questions (who/when can Lock; is Unlock possible and by whom). Their answers
carried a nuance not cleanly captured by the presented options, so I reflected it back with my
resolution and proceeded (no objection):

1. **Who can Lock, and when**: the Scenario Board already has **no role restriction** — any of the
   3 roles (admin/qa_lead/qa_engineer) can Pass/Fail/Note/attach Evidence on any Run today. Lock
   follows the same boundary: **any authenticated user who can already touch that Run's Scenario
   Board can Lock it** (not hard-restricted to literally match `run.tester`, a free-text field, not
   an account reference — exact identity-matching there would be fragile and would introduce a
   restriction pattern nothing else in the app uses). This matches the user's "let the QA who ran
   it lock it themselves" intent in practice, since they're the one there finishing up.
   - **Not gated on Gate=READY** — locking means "testing is done," not "testing passed." A final
     NOT READY result is just as legitimate to lock/finalize as a READY one.
   - **Placement**: Lock is its own explicit button (a click, never auto-triggered by "Send Summary
     to Linear" or "Executive Report" — an automatic trigger risks locking prematurely off a mere
     preview send), but positioned directly beside those two actions on the Scenario Board, so the
     natural flow (finish testing → send the report → lock it) has all three available together in
     one place.
2. **Unlock**: **admin OR qa_lead** (not admin-only), **reason required**, logged. Implemented as an
   append-only audit log (`RunLockEvent`) rather than a single "last reason" field, since a flat
   field would lose history across repeated lock/unlock cycles — and the whole point of requiring a
   reason is that it stays inspectable later.
3. **UI treatment of a locked Run**: read-only Pass/Fail/Notes/Evidence, a visible "🔒 Locked by
   {who} · {when}" badge, Edit Run link hidden. Unlike [REQ-035](REQ-035_manage_tags_ux_redesign.md)'s
   "informative-disabled" pattern (a plain `disabled` attribute would've made that feature's "why is
   this blocked" modal unreachable), a native `disabled` attribute is fine here — the locked badge
   is already persistently visible on the page before any interaction, so there's no missing "why"
   to explain via a click. The real risk was the 1/2/3 keyboard shortcut, which bypasses any
   button's `disabled` state entirely — guarded with an explicit `if (locked) return` at the top of
   every mutating function (`setStatus`/`commitNotes`/`uploadEvidence`/`removeEvidenceItem`/
   `passAllRemaining`), not just on the buttons.
4. **Relationship to REQ-030**: complementary, shipped together per explicit user instruction
   ("ทำต่อกันเลยทั้งคู่") — no hard dependency either direction, as originally noted.

## Implementation

- `prisma/schema.prisma`: `Run` gains `locked Boolean @default(false)`, `lockedAt DateTime?`,
  `lockedBy String?` (email). New `RunLockEvent` model (append-only, `runPartitionKey`-verbatim
  pattern matching `ScenarioResult` — no FK, since `runPartitionKey` can't be reliably split back
  into `siteKey`/`runId`): `id, runPartitionKey, action ("LOCK"|"UNLOCK"), byEmail, reason?, at`.
- `lib/types.ts`: `RunEntity` gains `locked, lockedAt?, lockedBy?`. New `RunLockEventEntity`.
- `lib/db/tables.ts`: `runRowToEntity`/`runEntityToData` thread the 3 new Run fields;
  `addRunLockEvent()`/`listRunLockEvents()` added, mirroring the existing
  `upsertScenarioResult()`/`listScenarioResults()` pair's shape.
- `lib/runs.ts`:
  - New `RunLockedError extends CreateRunError` (409).
  - `updateScenarioResult()`, `addEvidence()`, `removeEvidence()`, `updateRunMetadata()` each throw
    `RunLockedError` if `run.locked` — enforced at the `lib/runs.ts` layer (not just hidden in the
    UI), same defense-in-depth precedent as `createRun()`'s inactive-site check.
  - New `lockRun(siteKey, runId, byEmail)` / `unlockRun(siteKey, runId, byEmail, reason)` /
    `getRunLockHistory(siteKey, runId)`.
- New API routes: `POST /api/runs/[site]/[runId]/lock` (`requireApiUser()` — any role),
  `POST /api/runs/[site]/[runId]/unlock` (`requireApiRole(CAN_EDIT_CONTENT)`, body `{ reason }`,
  400 if blank). Existing PATCH scenario / evidence POST / DELETE routes need no route-level
  change — they already funnel `CreateRunError` subclasses to a JSON error response, so
  `RunLockedError` (409) is handled automatically.
- UI (`ScenarioBoard.tsx`, `app/[site]/[runId]/page.tsx`, `edit/page.tsx`): Lock/Unlock buttons +
  confirm modals (reusing the existing `.modal-overlay`/`.modal-card` pattern), locked badge,
  read-only board state, collapsible Lock History list, Run Edit page's Server Action catches
  `RunLockedError` the same way it already catches `CreateRunError`.

## Bug found + fixed during verification

**Edit Run link went stale after a client-side Unlock.** Originally the "Edit Run" link's
`canEdit && !run.locked` check lived in `page.tsx` (a Server Component, rendered once per page
load). Lock/Unlock happen client-side via `fetch()` inside `ScenarioBoard` without a full page
navigation, so unlocking never made the link reappear until a manual reload — caught by the manual
Puppeteer walkthrough (checked the link right after an Unlock, no reload). Fixed by moving the
link's rendering into `ScenarioBoard` itself, next to the Lock/Unlock button, so it reacts to the
same live `run.locked` client state as everything else on the board.

## Verification Log

- [x] Locking a Run blocks `updateScenarioResult()` at the `lib/runs.ts` layer, not just the UI —
  verified via a direct `fetch()` PATCH against a real (still-live) scenario id while locked,
  returned exactly `409 "This Run is locked and can no longer be edited"`. (First attempt used a
  nonexistent scenario id and only proved the *unrelated* scenario-existence check, since that
  validation runs before the lock check — caught the gap, re-ran against a real id fetched from
  `GET /api/runs/[site]/[runId]` to get a real 409, not a false-positive 400.)
  `addEvidence()`/`removeEvidence()`/`updateRunMetadata()` share the identical
  `if (run.locked) throw new RunLockedError()` guard placed immediately after loading `run`, before
  any scenario-specific lookup, so the same 409 applies to all four write paths.
- [x] A plain qa_engineer can Lock a Run but does not see an Unlock button; admin/qa_lead do (both
  the button's presence and a direct `POST /unlock` attempt were checked).
- [x] Unlock without a reason is rejected (400, confirmed via direct `fetch()`); with a reason,
  succeeds and both the LOCK and UNLOCK events (with reason) appear in Lock History.
- [x] Content-drift + delete-protection (REQ-030's guarantees) hold even through a Lock/Unlock cycle
  on the same Run — edited-then-deleted Scenario stayed visible on the Run's Board throughout.
- [x] `npm run build` clean; `npm run test:e2e` 27/27 (24 baseline + 3 added concurrently by another
  session for REQ-025, unrelated to this REQ — confirmed compatible).
- [x] Manual Puppeteer, 18-point checklist on a dedicated verification site (created/cleaned up):
  Lock as qa_engineer → read-only board + hidden Edit Run link → server-side 409 on direct PATCH →
  blank-reason Unlock rejected (400) → Unlock as qa_lead with a reason → Edit Run link reactively
  reappears (post-fix) → Lock History shows both events with the reason. Screenshot captured.
