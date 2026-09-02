# REQ-040: Scenario Board — Steps & Criteria Expand/Collapse per Card

**Status:** ✅ Implemented and verified (2026-09-02)
**Priority:** P2

## Context

User pointed at a live Run Detail screenshot (Scenario Board — where a tester actually records
Pass/Fail/Block) and asked whether Test Steps / Expected Pass Criteria display had been done there
yet. It had not — confirmed via `grep` that `app/[site]/[runId]/ScenarioBoard.tsx` never renders
`steps`/`criteria` anywhere. This was mistaken for already-scoped work because REQ-039's own SRS
draft had (wrongly) claimed such a component already existed on the Run page to reuse — that claim
was corrected during REQ-039 (see its spec's Context section) into "genuinely new UI, and only
built for the Suite Scenario Picker admin page," never the Scenario Board itself. Checked every
other spec file for a prior mention (REQ-008/REQ-010, the two Scenario Board UX phases) — neither
mentions Steps/Criteria at all. So this is a **new** request, not something that fell through the
cracks of an earlier one.

Verified feasibility before writing this plan: `ScenarioWithResult` (`lib/runs.ts`) already extends
`ScenarioDef`, which already carries `steps`/`criteria` — REQ-030's snapshot mechanism means every
card rendered on the Board already has this data in memory (`sc.steps`/`sc.criteria`), no new
fetch/query/schema change needed. This is a pure UI addition to one existing file.

## Decision (confirmed with user via AskUserQuestion)

Expand/collapse per card, **default collapsed** — chosen over "always shown" specifically to
protect the Board's scannability (a tester needs to see Pass/Fail/Block state across every card at
a glance; steps+criteria text shown open on every card at once would multiply card height 3-4x and
push most of the Run off-screen).

BA/UX brief (verbatim reasoning, confirmed accurate against the real page):
- Default state: collapsed on every card.
- Trigger: a small text button `▾ Steps & Criteria` placed under the name/role block.
- Progressive disclosure matches real testing workflow — a tester only needs the detail while
  actively executing that one case, or reviewing criteria after a Fail.
- Consistency with REQ-039's `ScenarioExpandableRow` (Suite Picker, admin side) — same interaction
  language on both the execution and admin sides.

**Scope decision made here, flagged rather than silently applied**: the brief's "Active Execution
Helper" (auto-expand the card being interacted with) is worded as an *optional* enhancer, not a
hard requirement. Not implementing it in this pass — the existing card already sets keyboard focus
(`focusedIndex`) and calls `setFocusedIndex` on any click inside a card (Pass/Fail/Block buttons,
Notes field, Evidence controls all bubble up to it already); tying an *auto-expand* to that same
broad click surface risks surprising a tester who just wanted to click Pass, not open a text block.
Manual toggle only, for this pass. Can be revisited if real usage shows testers wanting it.

## Design notes for implementation (non-binding, refined during `EnterPlanMode`)

- New `expandedIds: Set<string>` local state in `ScenarioBoard.tsx`, toggled per scenario id —
  same shape as the `selected`/expand-state patterns already used elsewhere in this app (e.g.
  REQ-039's `SuiteScenarioPicker`), not a new pattern.
- Reuse the exact CSS classes REQ-039 already added for this (`.scenario-expand-detail`,
  `.scenario-steps-box`, `.scenario-criteria-box`) — same visual language, zero new CSS needed
  unless the Board's card layout needs a small adjustment.
- `data-testid`s follow this file's own existing local convention (`smoke-runner:scenario-item:
  <element>__<id>`), not REQ-039's `scenario-picker` component name — this is a different page/
  component context per the `datatest-id-standard` skill.
- No changes to `lib/runs.ts`, `lib/types.ts`, or any server action — purely additive JSX + local
  state in one existing Client Component.

## Automated test coverage (added 2026-09-02)

The verification below was manual-only at the time (scratch Playwright scripts, deleted after
each run). Permanent coverage now exists at `e2e/tests/11-scenario-board-steps-criteria.spec.ts`
(2 tests: independent per-card expand/collapse with real content assertions against the seeded
`E2E_SCENARIOS` fixture, and toggling on a locked Run).

## Verification plan (completed)

- [x] `npm run build` clean; `npm run test:e2e` 27/27.
- [x] Manual Playwright against real seeded data (`RUN-NUH-0001`/`0002`, not scratch — restored
  exactly afterward, confirmed via Postgres):
  - All cards collapsed on load; toggle opens exactly the clicked card's detail block; expanding a
    second card leaves the first one open (independent per-card state, not a single "which card is
    open" variable); collapsing one leaves the other open. Steps text renders with real content.
  - Keyboard shortcut (tested with whichever of `2`/`3` differed from the scenario's real original
    status) still flips status correctly with the new button present; the scenario's exact original
    status was captured before the test and clicked back afterward — confirmed restored.
  - Locked a real Run (`RUN-NUH-0002`), confirmed the toggle still opens the detail panel while
    locked (correctly NOT gated, unlike status/notes/evidence), then unlocked it again immediately
    (reason logged: "REQ-040 verification - reverted immediately") — both Runs confirmed back to
    `locked = false` in Postgres afterward, exactly as found.
