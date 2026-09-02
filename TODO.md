# TODO — Project Backlog & Execution Tracker

This file is a **status dashboard/index**, not a spec archive. One line per task: checkbox +
priority + link to its full requirement/design/verification record in `specs/REQ-xxx_slug.md`.
Never delete a line once it exists — flip its checkbox or add a short status note, don't remove
history.

`specs/REQ-xxx_slug.md` answers **WHAT & WHY** (requirement, design decisions confirmed via
AskUserQuestion, implementation notes, verification narrative). `TODO.md` answers **STATUS &
WHEN**. The `EnterPlanMode` plan file (`~/.claude/plans/streamed-wibbling-lamport.md`) is a third,
separate thing: a rotating scratch file used only for the live plan-approval conversation for
whichever task is in progress right now — it gets overwritten by the next task and is not a
durable record. Once a plan is approved and the work is done, its lasting record lives in
`specs/`, not the plan file.

## House rules (apply to every session/agent working on this repo)

> ℹ️ `web/README.md` มีหัวข้อ "แผนการพัฒนาในอนาคต (Roadmap)" — เป็นแพลนบันทึกทิศทาง **ไม่ใช่คำสั่งให้เริ่มทำ**
> ห้าม Implement Item ไหนในนั้นจนกว่าจะสั่งเจาะจง (กฎถาวรใน `AGENTS.md`)
>
> ℹ️ **งานทุกขนาด** แม้แก้ไฟล์เดียว/Text-CSS จุดเดียว ต้องผ่าน `EnterPlanMode` ก่อนเริ่มเขียนโค้ดเสมอ ไม่มีข้อ
> ยกเว้นสำหรับ "งานเล็ก" (กฎถาวรใน `AGENTS.md`) — ก่อนเริ่มโค้ด ให้เขียน/อัปเดต `specs/REQ-xxx_slug.md` ก่อน
> (ที่นี่คือที่เก็บ WHAT/WHY ตอนนี้ ไม่ใช่ยัดลง TODO.md แบบเดิม) แล้วเพิ่ม/ติ๊ก 1 บรรทัดใน TODO.md ชี้ไปที่ไฟล์
> นั้น

## Active / Backlog

- [ ] **[Unset]** [REQ-037: Site-configurable Data Chain Field Schema](specs/REQ-037_site_configurable_data_chain_schema.md) — split จาก REQ-024, ยังไม่ scope — ต้องตอบคำถามเชิงธุรกิจ/สถาปัตยกรรมก่อน (demand จริงแค่ไหน, EAV/JSONB impact ต่อ query/report, ต้อง snapshot schema แบบ REQ-030 ไหม)
- [x] **[P2]** [REQ-025: Run History view](specs/REQ-025_run_history_view.md) — search + Gate/Environment/date filters + pagination on `/{site}`; Run.name as card headline; client-side so it didn't touch REQ-030/031 files. Implemented by another concurrent session, which ran out of context before verifying/committing — picked up, re-verified (build clean, e2e 27/27), and found+fixed a real bug: the filter row's CSS referenced non-existent custom properties, rendering unstyled controls (see spec for detail)
- [ ] **[P3]** [REQ-027: Provision real Azure resources + Deploy](specs/REQ-027_provision_azure_deploy.md) — ⚠️ DB provisioning step เปลี่ยนเป็น Postgres hosting ตาม REQ-029 (ยังไม่ตัดสินใจรายละเอียด), ส่วน Evidence/Blob ยังเป็น Azure เหมือนเดิม
- [ ] **[P4]** [REQ-022: CSV/Excel Scenario Import](specs/REQ-022_csv_excel_scenario_import.md) — confirmed last-priority, not yet planned

## Completed

- [x] **[P1]** [REQ-001: Trunk-based Git Setup + Strict Project Isolation Rule](specs/REQ-001_trunk_based_git_setup.md)
- [x] **[P0]** [REQ-017: Scaffold Next.js app + Azure Table Storage client + core vertical slice](specs/REQ-017_scaffold_nextjs_azure.md)
- [x] **[P0]** [REQ-018: Fastify split & revert (architecture detour)](specs/REQ-018_fastify_split_and_revert.md)
- [x] **[P1]** [REQ-019: Auth (Email+Password) + Scenario/Site CRUD](specs/REQ-019_auth_and_scenario_site_crud.md)
- [x] **[P3]** [REQ-020: Combine `azurite`+`dev` into one script](specs/REQ-020_combine_dev_scripts.md)
- [x] **[P1]** [REQ-021: UX/UI Redesign (Jira palette + Linear polish)](specs/REQ-021_ux_redesign_jira_linear.md)
- [x] **[P1]** [REQ-002: Test Suites (Master Scenario grouping + multi-suite pivot)](specs/REQ-002_test_suites.md)
- [x] **[P1]** [REQ-003: Master Scenario Library + Clone-to-Site](specs/REQ-003_master_scenario_library.md)
- [x] **[P1]** [REQ-004: User Management (multi-role, deactivate, change password)](specs/REQ-004_user_management.md)
- [x] **[P3]** [REQ-012: Home page hero header](specs/REQ-012_home_hero_header.md)
- [x] **[P2]** [REQ-013: Site Picker vs Admin Scenario Picker differentiation](specs/REQ-013_site_picker_differentiation.md)
- [x] **[P1]** [REQ-014: Linear Report export + Executive Report page + Evidence Upload](specs/REQ-014_linear_executive_report_evidence.md)
- [x] **[P1]** [REQ-015: Run Edit (metadata edit + Tester lock)](specs/REQ-015_run_edit_metadata.md)
- [x] **[P1]** [REQ-016: Playwright E2E Test Suite](specs/REQ-016_playwright_e2e_suite.md)
- [x] **[P1]** [REQ-005: Translate UI to English](specs/REQ-005_translate_ui_to_english.md)
- [x] **[P1]** [REQ-006: Site CRUD (Active/Inactive) + Manage menu grouping + bigger Start Run button](specs/REQ-006_site_crud_and_manage_menu.md)
- [x] **[P1]** [REQ-007: Move sub-nav buttons into the Manage dropdown](specs/REQ-007_manage_dropdown_consolidation.md)
- [x] **[P1]** [REQ-008: Scenario Board UX Phase 1 (Quick Wins)](specs/REQ-008_scenario_board_ux_phase1.md)
- [x] **[P1]** [REQ-009: Refactor Gate Result & Context Summary (remove UAT hardcode)](specs/REQ-009_gate_result_remove_uat_hardcode.md)
- [x] **[P1]** [REQ-010: Scenario Board / New Run UX Phase 2](specs/REQ-010_scenario_board_new_run_ux_phase2.md)
- [x] **[P1]** [REQ-011: Tag-based Cross-Suite Filtering](specs/REQ-011_tag_based_filtering.md)
- [x] **[P2]** [REQ-028: "ลืมรหัสผ่าน?" affordance บนหน้า Login](specs/REQ-028_forgot_password_login_affordance.md) — combined toggle pointing to Admin contact email; ปรับ CSS ตาม feedback ให้ดูเป็นปุ่มกดได้ชัดเจนขึ้น (chevron + hover underline/background)
- [x] **[P4]** (bookkeeping-only, no spec file) TopNav "ST Smoke Test Runner" brand mark didn't read
  as clickable — user feedback. Added `.top-nav-brand:hover` background pill + mark lift/shadow +
  `title="Go to home"` tooltip so it's clear it links to `/`. `web/app/TopNav.tsx` +
  `web/app/globals.css`. Verified: build clean, e2e 24/24, Puppeteer hover screenshot.
- [x] **[P1]** [REQ-029: Migrate DB จาก Azure Table Storage ไป PostgreSQL (Docker)](specs/REQ-029_postgres_migration.md) — Prisma 7 (driver adapter), docker-compose (port 5435), 6 lib/db/*.ts แทน lib/azure/*-table.ts (ลบไฟล์เก่าแล้ว), Evidence ยังอยู่ Azure Blob เหมือนเดิม, build+e2e 24/24+manual CRUD verify ผ่านหมด
- [x] **[P4]** (bookkeeping-only, no spec file) Rebrand "Smoke Test Runner" → "Test Runner" — h1/title/
  README/badge (`ST`→`TR`) across `app/TopNav.tsx`, `app/login/page.tsx`, `app/page.tsx`,
  `app/layout.tsx`, `README.md`, `lib/types.ts` comment, + updated 4 E2E spec assertions that check
  the old text. Verified: build clean, e2e 24/24, Puppeteer screenshot + login check.
- [x] **[P4]** (bookkeeping-only, no spec file) Static-data audit (user asked "เช็คข้อมูลที่เป็น static") —
  found `web/lib/config.ts` (already tracked as REQ-024) + stale post-REQ-029 comments in
  `web/data/scenarios/README.md` and both `temp_scripts/seed_*.ts` files still describing Azure
  Table Storage/Cosmos DB. Updated all three to describe the current Postgres setup; also flagged
  (via `// FIXME` comments, not fixed) that `seed_admin_user.ts` predates multi-role support and is
  actually broken — superseded by `npm run db:seed`, kept only for history.
- [x] **[P1]** [REQ-032: System-generated Running Number ID Scheme](specs/REQ-032_running_number_id_scheme.md) — MST-/SUT-/CUST-/RUN- prefixes, atomic `IdSequence` counter table (Prisma upsert = Postgres `ON CONFLICT DO UPDATE`), id inputs removed entirely from 4 Create + locked read-only on 3 Edit pages, new `Run.name` field, E2E rework (found+fixed a `waitForURL` race bug along the way). build+e2e 24/24+manual Puppeteer verify (incl. independent per-site counters) all pass
- [x] **[P1]** [REQ-033: Seed NUH Cortex v2.7.0 Master Scenario Library](specs/REQ-033_nuh_cortex_master_scenario_import.md) — 17 Master Scenarios (`MST-0001`–`MST-0017`) + 34 Tags, imported via `temp_scripts/seed_nuh_cortex_master_scenarios.ts` through the real `createScenario()`/`nextMasterScenarioId()` flow (not a Bypass) after clearing 2 REQ-032-verification test rows + resetting the `MST` counter — verified against Postgres + UI, counter correctly at 17
- [x] **[P2]** [REQ-034: Stand up Site NUH + verify Suite/Clone/Run end-to-end](specs/REQ-034_nuh_site_suite_run_verification.md) — 3 Suites (Smoke/OPD/IPD, membership derived from existing flow/tags data), Clone all 17 into Site NUH (ids match Master exactly), first Run `RUN-NUH-0001` with Suite ∩ Tag filter → 11→7 scenarios exactly as hand-calculated. All via real UI (Puppeteer), not scripted bypass; verification-walkthrough scripts kept in session scratchpad only, not committed
- [x] **[P2]** [REQ-035: Manage Tags UX Redesign — Usage Count + Safe Delete + Search + Pagination + Sort](specs/REQ-035_manage_tags_ux_redesign.md) — Usage count (Master-only scope), Hard Block delete when in-use (server + UI), search + stats bar + pill styling + pagination (10/25/50/100, default 10) + clickable-header column sort, all added same session. Found+fixed a real bug along the way: native `disabled` buttons never fire `onClick`, which would've made the "why is this blocked" modal impossible — switched to a styled-but-clickable `.btn-danger-text--blocked`. build+e2e 24/24+manual Puppeteer verify (screenshots confirm Delete button color distinction, pagination page-count, and ascending/descending sort) all pass
- [x] **[P2]** [REQ-036: Master Scenario — Origin Site (`sourceSite`) field](specs/REQ-036_master_scenario_source_site.md) — Free-text field, server-normalized (`.trim().toUpperCase()`) at the single `createScenario()` write boundary, default `CORE`, backfilled the 17 existing NUH scenarios (Master + Site NUH clones) to `NUH`; Site Custom Scenario creation auto-sets it to the site id (no form field). Filter dropdowns (GET query param, no new client component) on Master Library list + Clone-from-Master. Found+fixed a TS narrowing-across-closure bug along the way. build+e2e 24/24+manual Puppeteer verify (normalization, filters, auto-set) all pass
- [x] **[P1]** [REQ-030: Refactor ScenarioResult to store a full content snapshot](specs/REQ-030_scenario_result_full_snapshot.md) — Shipped together with REQ-031 (same review, complementary, no hard dependency). Eager snapshot at `createRun()` time (name/desc/role/flow/steps/criteria + live `critical`, 6 nullable columns, no backfill of old rows), plus a second bug fixed in the same pass: `scenarioIdsJson` is now *always* snapshotted (not just when Suite/Tag-filtered), so a deleted Scenario no longer vanishes from historical Runs. New `resolveRunScenarios()` helper is the single "prefer snapshot, live-join fallback for pre-REQ-030 rows" rule shared by `getRunDetail()` + the gate recompute. build+e2e 27/27+manual Puppeteer verify (edited-Scenario steps + deleted-Scenario both confirmed frozen on the old Run) all pass
- [x] **[P2]** [REQ-024: Environment Catalog CRUD](specs/REQ-024_environment_data_chain_schema_crud.md) — Rescoped 2026-09-02: found `DATA_CHAIN_FIELDS` was dead code (HN/VN/AN/Bill are hardcoded fixed columns on `Run`, not driven by any config) — split that half out to [REQ-037](specs/REQ-037_site_configurable_data_chain_schema.md) (unscoped, needs BA/SA input first), kept REQ-024 to just the Environment list (used in 3 places, low risk). New `Environment` model (cuid id, name, orderIndex, active) mirrors `Site`'s soft-deactivate/in-use-guarded-delete pattern; admin CRUD mirrors `admin/sites/*` file-for-file; 3 consumers migrated off the static `ENVIRONMENTS` array. build+e2e 27/27+manual Puppeteer 13-point verify (incl. deactivated-Environment-still-shows-correctly-on-its-own-Run's-Edit-page, in-use delete block) all pass — one script-assertion false-negative caught and cross-checked against the DB directly before concluding it actually worked
- [x] **[P3]** ~~[REQ-026: Migrate old `test_results/*.json`](specs/REQ-026_migrate_old_test_results.md)~~ — closed Superseded/Not Applicable (2026-09-02), no code changed. Checked first: only 1 file exists (not `*.json` plural), untouched since the repo's initial commit, uses a pre-REQ-032 id scheme. Its scenario ids do trace back to what became REQ-033's real import (not disconnected fixture noise), but Site NUH now has real Suites/Runs (REQ-034) that fully supersede it. Confirmed with the user: importing it as a real Run would record a test that never happened, contrary to REQ-030/031's audit-trail integrity — file left in place untouched, not deleted
- [x] **[P1]** [REQ-023: `data-testid` audit against the skill](specs/REQ-023_datatestid_audit.md) — character-level audit script (not committed) found 0 false gaps beyond 2 real ones: 4 missing spots in `FilterPicker.tsx` (fixed directly, single-file/unambiguous), and ~29 breadcrumb/inline-helper links across 20 files with zero testids (consistent pre-existing pattern — asked user whether to leave as-is or add per skill's letter; chose to add all). Also root-caused and fixed an unrelated E2E flake hit along the way: an 11h-old stray `azurite` process with 224MB of accumulated blob state was slowing evidence uploads past the test timeout — killed it, not a code regression. build clean, e2e 27/27, manual Puppeteer spot-check across 9 pages
- [x] **[P2]** [REQ-031: Add Run Lock/Finalize mechanism](specs/REQ-031_run_lock_finalize_mechanism.md) — Lock: any authenticated user (same boundary as the Scenario Board itself — no admin/qa_lead restriction), not gated on Gate=READY, button placed beside Send-to-Linear/Executive-Report. Unlock: admin/qa_lead only, reason required, logged to append-only `RunLockEvent`. Enforced server-side in `lib/runs.ts` (409 `RunLockedError`) on every write path, not just hidden in the UI. Found+fixed a real bug during verification: the Edit Run link was gated in the parent Server Component, so it stayed frozen after a client-side Unlock until a manual reload — moved into `ScenarioBoard` so it reacts live. build+e2e 27/27+manual Puppeteer verify (18-point checklist incl. role gating, server-side 409 on direct PATCH, blank-reason rejection) all pass

## This reorganization itself

- [x] **[P1]** Split TODO.md into this dashboard + per-feature `specs/REQ-xxx.md` files (this task
  has no REQ file of its own — it's the meta-task that created the convention). Confirmed via
  AskUserQuestion: migrate all existing history now (not just going forward), and the Plan File
  stays a separate complementary artifact from `specs/`. 27 REQ files created porting every prior
  TODO.md entry verbatim (content relocated, not rewritten); `[x]`/`[ ]` counts verified to match
  the old file before/after.
