# REQ-025: Run History view

**Status:** ✅ Done
**Priority:** P2

## Context

Originally logged together with "ผูก Entra ID Auth" as one entry; the Entra ID half was
superseded when the project moved to Email+Password auth (REQ-019). The Run History view part of
that original entry was never actually implemented and is still outstanding — this REQ tracks
just that remaining half.

`app/[site]/page.tsx` already rendered a basic list of Runs for a site (ID, Gate, env/cycle/date/
tester, Pass/Fail counts). Confirmed that "Run History view" means upgrading **that same page**,
not a new route.

## Decisions (confirmed)

1. **Stay on `/{site}`** — site isolation; no cross-site history page.
2. **Card headline:** `run.name.trim()` when present, otherwise `run.rowKey`. System id always
   remains on the meta line.
3. **Search:** case-insensitive substring on `rowKey` **or** `name`.
4. **Gate filter:** `All` | `READY` | `NOT READY` only. There is no Gate=`BLOCKED` in this app
   (Blocked is a scenario status). Do not invent a third gate option.
5. **Environment filter:** `All` plus distinct `environment` values on the loaded runs, with
   `ENVIRONMENTS` from `web/lib/config.ts` ordered first so STAGING/UAT/DEV/PRE-PROD/PROD appear,
   and any legacy custom string remains filterable.
6. **Date range:** inclusive `from` / `to` on `executedDate` (`YYYY-MM-DD`; lexicographic compare
   is valid). Empty side means unbounded.
7. **Pagination:** REQ-035 pattern — 10 / 25 / 50 / 100, default 10, Prev/Next, clamp page when
   filters shrink the set. **Client-side** slice after `listRunsForSite()` so this REQ does not
   touch Prisma / `lib/db/tables.ts` / `lib/runs.ts` (those files are in flight on REQ-030/031).
8. **No lock badge** — `Run.locked` is landing in REQ-031; this page must not depend on it.
9. **CSS:** new `RunHistoryList.module.css` for the filter row only. Do **not** edit `globals.css`
   (REQ-031 lock styles). Reuse `stats-bar`, `pagination-bar`, `card`, `gate-badge`, `stat-pill`.

## Implementation

- `web/app/[site]/page.tsx` — Server Component still fetches via `listRunsForSite`; header + New
  Run button stay here. List body moves into `RunHistoryList`.
- `web/app/[site]/RunHistoryList.tsx` — client search / filters / pagination / cards.
- Existing testids kept: `smoke-runner:run-history:btn__new-run`, `row__{runId}`.
- New testids (module `smoke-runner`, component `run-history`): `input__search`, `select__gate`,
  `select__environment`, `input__date-from`, `input__date-to`, `select__page-size`,
  `btn__page-prev`, `btn__page-next`, `text__page-status`, `text__stats`, `txt__name__{runId}`.

## Bug found + fixed during handoff review

The agent that implemented this ran out of context before verifying/committing. Picked up to
review: functionally correct (build clean, e2e 27/27 as claimed), but
`RunHistoryList.module.css`'s `.filter select, .filter input` block referenced CSS custom
properties that don't exist in this codebase — `var(--border)`, `var(--bg-elevated, var(--bg))`,
`var(--text)` (the real names are `--border-color`, `--bg-card`/`#fff`, `--foreground` — see
`.field-row input/select/textarea` in `globals.css` for the established pattern). An unresolvable
`var()` with no valid fallback drops the whole declaration, so the Gate/Environment dropdowns and
From/To date inputs rendered as bare, unstyled native controls (no border, no background) —
confirmed via computed-style check and a screenshot before/after. Fixed by matching the real
variable names and the existing `.field-row` convention (incl. a `focus-visible` state, which
`.field-row` has and this component was missing).

## Verification

- [x] Empty `name` falls back to `rowKey` as headline; id still on the meta line.
- [x] Search matches id or name; gate / env / date filters AND together; page resets to 1.
- [x] Pagination default 10; empty-filter copy when nothing matches.
- [x] `npm run build` clean; e2e 27/27 including new cases in `02-site-and-run-history.spec.ts` (name headline, search, unnamed fallback, gate filter, pagination) — re-verified after the CSS fix.
- [x] Filter row (Gate/Environment/From/To) renders with the app's real border/background/radius, matching every other form control — confirmed via computed-style check + screenshot, not just visual guess.
