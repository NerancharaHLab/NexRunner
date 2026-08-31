# REQ-011: Tag-based Cross-Suite Filtering when starting a Run

**Status:** ✅ Done
**Priority:** P1

## Context

ผู้ใช้เล่า QA Best Practice เรื่อง Tag Convention (`@smoke`/`@p1`/`@regression` แบบ Playwright/Cypress/
TestRail/Xray) ตอนแรกเป็นแค่บริบทประกอบการตัดสินใจ Multi-suite (REQ-002) ไม่ใช่คำสั่งให้ทำ — ภายหลังผู้ใช้ยืนยัน
ให้ออกแบบระบบและวางแพลนทำจริง ยืนยัน 5 จุดผ่าน AskUserQuestion หลายรอบ: (1) Tag Catalog กลาง จัดการโดย
`admin`+`qa_lead` (`CAN_EDIT_CONTENT`) ไม่ใช่ Free Text (2) กันชื่อซ้ำแบบไม่สนตัวเล็ก/ใหญ่ (Case-insensitive)
(3) Flat List ไม่มี Category บังคับ (4) ตอนสร้าง Run เลือก Suite + Tag พร้อมกันได้ Scope รวมกันแบบ AND
(Suite ∩ Tag) (5) Tag Filter เป็น UI 2 ช่อง "ต้องมี (Include, Toggle AND/OR, Default OR)" + "ต้องไม่มี
(Exclude/NOT)" ไม่ทำ Free-text Boolean Expression Parser.

## Implementation & Verification Log

- [x] `lib/types.ts` — เพิ่ม `TAG_PARTITION`, `sanitizeTagId()` (Normalize เป็น Lowercase ต่างจาก
  `sanitizeScenarioId()`), `TagEntity`/`TagDef`; เพิ่ม `tagsJson?`/`tags: string[]` ใน
  `ScenarioEntity`/`ScenarioDef`/`ScenarioInput` + `parseScenarioTags()`; เพิ่ม
  `RunEntity.tagIncludeIdsJson`/`tagIncludeNamesJson`/`tagIncludeMode`/`tagExcludeIdsJson`/
  `tagExcludeNamesJson` (Optional ทั้งหมด — Run เก่าไม่มีผลกระทบ)
- [x] `lib/azure/scenarios-table.ts` — ร้อย `tags` ผ่าน `entityToDef`/`createScenario`/`updateScenario`
  (`cloneScenario()` ได้ Tag ติดไปฟรีเพราะ Copy ทั้ง Object อยู่แล้ว ไม่ต้องแก้เพิ่ม)
- [x] `lib/azure/tags-table.ts` (ใหม่) — `listTags/getTag/createTag/deleteTag` — `createTag` เช็ค
  `getTag(sanitizeTagId(name))` ก่อนเสมอ ถ้าเจอ Throw `TagAlreadyExistsError` ไม่ Silent Overwrite (ต่างจาก
  Scenario/Suite ที่ตั้งใจให้ Upsert-by-id ได้)
- [x] หน้า Admin ใหม่ 2 หน้า `admin/tags/{page,new/page}.tsx` (List/Delete/Create เท่านั้น ไม่มี Edit — ยังไม่
  มีใครขอ Rename) + ปุ่ม "จัดการ Tag →" ในหน้า `admin/scenarios/page.tsx`
- [x] เพิ่ม Checkbox เลือก Tag ในฟอร์ม `admin/master-scenarios/{new,[id]/edit}/page.tsx` **และ**
  `admin/scenarios/[site]/{new,[id]/edit}/page.tsx` (Site-level แก้ Tag ได้อิสระหลัง Clone เหมือน Field อื่น
  ทุกตัว)
- [x] `lib/runs.ts` — `CreateRunInput` เพิ่ม `tagIncludeIds`/`tagIncludeMode`/`tagExcludeIds`, Restructure
  `createRun()` ให้คำนวณ `scenarioIdsJson` ครั้งเดียวตอนจบจาก Scope สุดท้าย (จุดสำคัญที่แก้ทัน: เดิม Set แค่ใน
  เงื่อนไข Suite เท่านั้น ถ้ามีแค่ Tag Filter อย่างเดียวไม่มี Suite จะไม่ถูกบันทึก Scope เลย) — `scopeScenarios()`
  ไม่ต้องแก้เพราะอ่านจาก `scenarioIdsJson` เป็น Single Source of Truth อยู่แล้วไม่สนว่าใครเป็นคนคำนวณ
- [x] `app/[site]/new/page.tsx` — เพิ่ม Section "Tag Filter" (Include Checkbox + Select AND/OR, Exclude
  Checkbox) ต่อจาก Suite Section เดิม (ก่อนถูกแทนที่ด้วย FilterPicker ใน REQ-010)
- [x] `app/[site]/[runId]/page.tsx` — Subtitle แสดง Tag Include/Exclude ที่เลือกไว้ (ถ้ามี) ต่อจาก Suite เดิม
- [x] `npm run build` ผ่านสะอาด — Route ใหม่ `/admin/tags`, `/admin/tags/new` ขึ้นครบ
- [x] `npm run test:e2e` **24/24 ผ่านครบไม่มี Regression**
- [x] Manual/Puppeteer Verify เต็ม (สคริปต์ `shot_tags.js`): สร้าง Tag `smoke/payment/flaky/regression`
  (ต่อท้าย Timestamp กันชนของเก่า) → ลองสร้าง `Smoke-<ts>` (ตัว S ใหญ่) ซ้ำ ยืนยัน Reject ถูกต้องด้วยข้อความ
  `Tag "smoke-<ts>" มีอยู่แล้ว (เช็คตัวเล็ก/ใหญ่ด้วย)` (พิสูจน์ Case-insensitive Dedupe ทำงานจริง) → แปะ Tag
  Master Scenario A={smoke}, B={smoke,payment}, C={regression}, D={regression,flaky} → สร้าง Suite ครอบ
  {A,B,C} (ไม่รวม D) → Clone ทั้ง 4 ไปไซต์ E2E → **Run1** Include={smoke} (OR) ได้ A✓B✓ C✗D✗ ตรง Spec →
  **Run2** Include={smoke,payment} Mode=AND ได้ A✗B✓ ตรง Spec (พิสูจน์ AND แคบกว่า OR จริง) → **Run3**
  Include={regression} Exclude={flaky} ได้ C✓D✗ ตรง Spec (พิสูจน์ NOT ตัดออกจริงแม้ D จะมี Tag regression
  ที่ผ่าน Include ก็ตาม) → **Run4** เลือก Suite{A,B,C} พร้อม Include={smoke} ได้ A✓B✓ C✗D✗ (พิสูจน์
  Suite ∩ Tag) → **Run5** ไม่เลือก Suite/Tag เลย ได้ A✓B✓C✓D✓ ครบ + Scenario Fixture เดิมของไซต์ (Regression
  Check ผ่าน)
