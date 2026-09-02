# REQ-038: Master Scenario Library — Grouping, Search & Batch Clone Selection

**Status:** ✅ Done
**Priority:** P2 (raised by the user as the active feature after REQ-022/023/024/026/027/037 closed out)

## Context

Both `/admin/master-scenarios` (Master Scenario Library) and
`/admin/scenarios/[site]/clone-from-master` (Clone-from-Master) rendered a flat, unsearchable list.
With 17 real Master Scenarios today — and real onboarding of new hospitals expected to push this to
50-100+ — finding/selecting the right ones was already getting painful. User supplied a detailed
SRS (wireframe + workflow diagram): grouping by `flow` (OPD/IPD/General), a Group-by picker
(Flow/Source Site/None), search with auto-expand/collapse, group-level batch selection with an
indeterminate checkbox, and a Floating Action Bar for the Clone flow.

## Decisions (confirmed — verified the SRS against real code first, corrected 2 points, then got 4
explicit BA/UX answers)

**Corrections made** (both confirmed before proceeding):
1. Target path in the SRS was wrong: real route is `/admin/scenarios/[site]/clone-from-master`, not
   `/[site]/clone-scenarios`.
2. The SRS's "have to select one at a time" problem statement was inaccurate — Clone-from-Master
   already had multi-checkbox selection + one submit before this REQ. The real gap was ergonomics
   (no group-level select-all, no floating bar, no accordion grouping), not "impossible to
   bulk-select."

**BA/UX decisions:**
1. **"Add to Suite" is explicitly out of scope** — the Floating Bar only ever shows selected count,
   Deselect All, and "Clone to Site →". No new Suite-membership flow.
2. **Feature split by page purpose**: Master Library = **view/discovery only** (Search, Group by,
   Accordion, Tag badges — no checkboxes, no Floating Bar, since that page is per-row CRUD).
   Clone-from-Master = **full set** (everything above, plus group-header batch-select checkboxes
   and the Floating Bar wired to the existing Clone submit).
3. **Filter (data scope, REQ-036's `?source=`) and Group (visual organization) coexist, Filter
   wins.** Refinement proposed and accepted: rather than the BA's original "silently auto-switch
   Group-by back to Flow when a source filter is active," the **"Source Site" option is disabled**
   in the Group-by dropdown in that state — same outcome (no redundant single-item group), but the
   user sees *why* instead of experiencing an unexplained revert.
4. **Build the full pattern now**, not a stripped-down version — confirmed business reasoning (next
   hospital onboarding jumps the scenario count sharply; even at 17 rows, visually separating
   OPD/IPD reduces wrong-flow cloning mistakes today). Implementation constraint: plain React local
   state (`useState`/`useMemo`), no new dependency, no global store.

Confirmed via `grep` before starting that no existing E2E spec touches either page
(`07-admin-scenario-crud.spec.ts` covers the *Site* Custom Scenario list at
`/admin/scenarios/[site]`, a different page) — free to redesign, verification leans entirely on
manual Puppeteer.

## Implementation

- `app/admin/useScenarioGrouping.ts` (new) — shared hook, the single place FR-01/02/03 live for
  both pages: 3 fixed-order Flow groups (OPD → IPD → General, not alphabetical, matching the
  wireframe's reading order), Source Site grouping (alphabetical, one group per distinct value
  present), `"none"` flat-list fallback. Search matches name/steps/criteria/tags/id
  (case-insensitive substring). Expand state is a plain `Record<string, boolean>`, defaulting open;
  manual toggles persist there. While `search` is non-empty, expansion is *derived* instead (every
  group with ≥1 match forced open, 0-match groups hidden) without touching the manual state
  underneath — confirmed via a targeted Puppeteer check that the manual collapse reasserts itself
  correctly the instant search is cleared (see Verification Log for a self-caught false-negative on
  the first verification attempt).
- `app/admin/master-scenarios/MasterScenarioLibraryList.tsx` (new, Client Component) — search box +
  Group-by `<select>` (Source Site disabled when `?source=` is already active) + accordion, reusing
  the exact existing row markup (id/critical badge/sourceSite pill/name/flow·role) **plus new tag
  pills** (`sc.tags`, reusing the existing `.tag-pill` class — first time this app renders
  per-scenario tags anywhere). `app/admin/master-scenarios/page.tsx` keeps its unchanged
  server-side fetch/`?source=` filter/`deleteScenarioAction`, now just renders this component with
  the already-filtered list.
- `app/admin/scenarios/[site]/clone-from-master/CloneFromMasterList.tsx` (new, Client Component) —
  same search/group/accordion (via the shared hook) plus: a `Set<string>` of selected ids; each
  scenario checkbox stays a real `name="clone_${id}"` input so the existing `cloneAction` Server
  Action's `formData.get(...)` parsing needed zero changes; a group-header checkbox
  (checked/unchecked/**indeterminate**, the indeterminate flag set imperatively via a ref +
  `useEffect` since it isn't a real JSX/HTML attribute) that selects/deselects every scenario
  currently in that group; a Floating Action Bar (`position: fixed`, bottom-center) shown only when
  ≥1 is selected, with live count, Deselect All, and the existing "Clone to Site →" submit button
  now living inside it. `clone-from-master/page.tsx` keeps its unchanged fetch/filter/`cloneAction`
  definition, passing them down as props.
- `app/globals.css`: `.scenario-group-header`/`.scenario-group-body`/`.scenario-search-bar` (new,
  no existing equivalent) and `.floating-action-bar` (new — this app had no fixed/floating UI
  pattern before).

## Verification Log

- [x] `npm run build` clean
- [x] `npm run test:e2e` 27/27 (regression check — neither page has direct E2E coverage, confirms
  nothing else broke)
- [x] Manual Puppeteer, real 17 Master Scenarios + a scratch site (cleaned up after):
  - Default Flow grouping matches real counts exactly (OPD 4, IPD 11, General 2, correct critical
    counts per group)
  - Group by → None: single flat group; → Source Site: one group per real distinct `sourceSite`
    (confirmed NUH appears)
  - Search auto-expand/hide confirmed; tag pills render with real tag data
  - Clone-from-Master: clicking a group-header checkbox selects all 4 OPD scenarios at once,
    Floating Bar shows "4 Scenarios Selected"; deselecting one flips the group checkbox to
    indeterminate; "Deselect All" clears selection and hides the bar; submitting via the bar's
    "Clone to Site" clones exactly the selected scenarios into the scratch site, confirmed in the
    resulting list
- [x] **Self-caught issue during verification**: first attempt at testing "manual collapse state
  survives a search-then-clear cycle" reported a false failure — traced to the verification
  script's own input-clearing method (triple-click+Backspace) not reliably firing a real React
  `onChange` in headless Chrome, not a product bug. Re-tested with a clean native-setter +
  `dispatchEvent` approach and confirmed the actual behavior is correct before recording this as
  passing — did not take the first (flawed) result at face value.
- [x] Cleaned up all test data (scratch site + cloned scenarios) after verification.
