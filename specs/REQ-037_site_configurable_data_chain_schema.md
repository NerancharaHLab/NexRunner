# REQ-037: Site-configurable Data Chain Field Schema

**Status:** 🔲 Backlog — split out of REQ-024, not scoped, not started
**Priority:** Unset (needs BA/SA scoping before triage)

## Context

Split out of [REQ-024](REQ-024_environment_data_chain_schema_crud.md) (2026-09-02) after discovering
its premise didn't hold: `DATA_CHAIN_FIELDS` in `lib/config.ts` is **dead code**, never imported or
read anywhere in the app. The real HN/VN/AN/Bill No. fields visible on the New Run / Run Edit forms
are hardcoded fixed columns on the `Run` Prisma model (`hn`, `vn`, `an`, `bill` — plain `String`
columns), not driven by any schema/config at all.

So "Data Chain Field Schema CRUD" isn't "move an existing config into the DB" (REQ-024's original,
low-risk framing) — it's building a genuinely new **dynamic, presumably per-Site, custom-field
system** from nothing. That's a different-order task: real Run-model architecture change, not a
CRUD-page mirror of Suites/Tags. Deliberately NOT bundled into REQ-024's Environment CRUD work so
that quick win isn't blocked on this larger decision.

## Open questions (BA/SA scoping required before any EnterPlanMode work — none of these are answered yet)

1. **Business justification**: do hospital sites actually need custom/variable Data Chain fields, or
   do HN/VN/AN/Bill No. already cover ~95%+ of real cases? If every real site just needs the same 4
   fields, this REQ may not be worth building at all — worth confirming demand before designing
   anything.
2. **Schema & query impact**: if fields become dynamic (JSONB or EAV-style storage instead of fixed
   typed columns), every current fixed-column consumer needs a redesign — indexing/searching a Run
   by HN/VN, the New Run/Run Edit forms, Linear Report, Executive Report. Materially more complex
   than today's plain `WHERE hn = ...`-style access.
3. **Audit/snapshot boundary (compliance)**: if a Site adds/removes/renames a custom field later,
   does that retroactively affect how old Runs display their Data Chain values? This is the same
   class of problem [REQ-030](REQ-030_scenario_result_full_snapshot.md) solved for Scenario content
   — would a dynamic field schema need its own schema-level snapshot on top of REQ-030's
   value-level one, and is that scope worth it?
4. **Per-site vs. global**: do different hospital sites actually need genuinely different field
   *sets*, or just different labels/placeholders on the same fixed 4 fields (a much lighter ask)?

## Non-goals (for now)

Not scoped, not designed, not started. This file exists to hold the backlog intent and the specific
questions raised during REQ-024's split — not a spec to implement against.
