# REQ-026: One-off migration script for old `test_results/*.json`

**Status:** ⛔ Superseded / Not Applicable — closed without implementation (2026-09-02)
**Priority:** ~~P3~~ (moot)

## Context (original)

ย้าย sample `test_results/*.json` เดิม (จากยุค localStorage ก่อน Migrate มา Next.js + Azure) เข้า Azure —
best-effort, ไม่ใช่ Critical Path.

## Why this is closed instead of implemented

Checked the actual directory before starting (per house rule — verify a premise against reality
before implementing against it). Findings:

1. **Only one file exists**, not `*.json` (plural) as the original title implied:
   `test_results/test_result_NUH_SM-RUN-001_sample.json`.
2. **It's been untouched since the repo's very first commit** — no code, script, or doc references
   it except this spec and `TODO.md` themselves.
3. **The filename says `_sample`**, uses the pre-rebrand app name (`"Smoke Test Runner & Report
   Generator"`) and a Run ID scheme (`SM-RUN-001`) that predates REQ-032's system-generated
   `RUN-{SITE}-0001` scheme entirely.
4. **Its scenario content isn't unrelated fiction, though** — the `SC-01`, `SC-02 [A]`, etc. ids
   inside it correspond to the legacy ids embedded in the real Master Scenario names imported by
   REQ-033 (e.g. `MST-0001` = `"[SC-01] NUH: ลงทะเบียน คัดกรอง..."`). So this file was a genuine
   design-time prototype/draft that later became REQ-033's real import — not disconnected test
   fixture noise — but it's now **fully superseded**: Site NUH has real Suites (REQ-034), a real
   Run history (`RUN-NUH-0001` onward), and real Master Scenarios with correct current ids.

## Decision (confirmed with the user)

**Do not migrate this file into the system.** Importing it as a real `Run` would mean recording a
test execution that never actually happened (`executedDate: 2026-08-22`, before the app itself
existed) indistinguishable from genuine QA-run data — directly contrary to the audit-trail integrity
[REQ-030](REQ-030_scenario_result_full_snapshot.md)/[REQ-031](REQ-031_run_lock_finalize_mechanism.md)
exist to protect. Building a `SC-XX → MST-XXXX` mapping script for one demo file that predates the
current system isn't worth the effort either way.

**The file itself is left in place, untouched** — not deleted, not moved. Deleting/archiving it
wasn't requested and touches git history for no functional gain; it's inert and harmless where it
is.

## Verification

Not applicable — no code changed.
