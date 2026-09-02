# REQ-037: Site-configurable Data Chain Field Schema

**Status:** ⛔ Won't Fix / Shelved — by architecture decision (2026-09-02), closed without
implementation
**Priority:** ~~Unset~~ (moot — decided not to build)

## Context

Split out of [REQ-024](REQ-024_environment_data_chain_schema_crud.md) after discovering
`DATA_CHAIN_FIELDS` in `lib/config.ts` was dead code — the real HN/VN/AN/Bill No. fields are
hardcoded fixed columns on the `Run` Prisma model, not driven by any schema. This file recorded 4
open questions that needed BA/SA input before any design work could start (business justification,
schema/query impact, audit/snapshot boundary, per-site vs. per-label scope).

## Decision: reject dynamic schema, keep the 4 fixed fields

User provided a full BA+SA analysis answering all 4 questions. Recorded here as the closing
reference for this backlog item:

1. **Business justification — no real demand.** In Thai hospital HIS practice (public, university
   e.g. NUH, and private), the Patient Journey / Revenue Cycle is anchored on exactly these 4
   identifiers: HN (patient identity), VN (OPD visit), AN (IPD admission), Bill No./Invoice
   (finance/discharge). For a Smoke Test Runner scoped to Happy-Path/core-integration testing of
   OPD/IPD flows, these 4 cover 99%+ of real cross-verification needs — anything else (Lab Order
   No., X-ray Accession No., Prescription No.) is a Scenario-level sub-identifier, not a Run-level
   Data Chain anchor.
2. **Schema/query impact — negative ROI.** Flat columns today give fast `WHERE hn = ?` (plain
   B-tree index), type-safe direct field access in the Run display, Linear Report, and Executive
   Report. Moving to JSONB/EAV would need GIN indexing, lose type safety (`Record<string, string>`
   everywhere), and force every report pipeline to do dynamic key mapping — real cost with no
   matching business need funding it.
3. **Audit/snapshot boundary — real compliance hazard.** A Site freely adding/removing/renaming
   field definitions over time raises exactly the "what did this field mean 6 months ago" question
   [REQ-030](REQ-030_scenario_result_full_snapshot.md) exists to prevent for Scenario content — would
   require a schema-level snapshot layered on top of REQ-030's value-level one, adding real
   complexity with no business need behind it.
4. **Per-site fields vs. per-site labels — at most a labeling difference.** Different hospitals may
   call HN something else locally ("เลขประจำตัวผู้ป่วย") or Bill No. "Receipt No."/"Invoice No.", but
   the underlying entity never actually changes. Not a case for structural per-site fields.

**Conclusion**: keep `hn`/`vn`/`an`/`bill` as fixed typed columns on `Run` — simple, type-safe,
performant, matches Thai HIS standard practice universally. Closed as Won't Fix to prevent future
scope creep back into this idea without a genuine new business driver.

**If a real future need appears**, the lowest-impact path noted (not designed, not scheduled): an
optional `customMetadata: Json?` field on `Run` for free-form key-value context, kept entirely
separate from the 4 core anchors rather than replacing them.

## Non-goals

Not scoped further, not designed, not implemented. Nothing to verify — no code changed.
