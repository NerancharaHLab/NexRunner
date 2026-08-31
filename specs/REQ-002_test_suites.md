# REQ-002: Test Suites (Master Scenario grouping + multi-suite pivot)

**Status:** ✅ Done
**Priority:** P1

## Context

ผู้ใช้ขอให้จัด Scenario เป็นชุด (Suite) ก่อนเทส ยืนยันผ่าน AskUserQuestion: Suite เป็นแบบกลาง/ใช้ร่วมกันเหมือน
Master Scenario Library, 1 Scenario อยู่ได้หลาย Suite (Many-to-many)

**ระหว่างทำ ผู้ใช้ส่งรายละเอียดเพิ่ม (Diagram ลำดับชั้น Run→Suite→Scenario→Test Case) ที่ขัดกับ Premise เดิม** —
เดิมออกแบบไว้ 1 Run = 0-1 Suite แต่ในทางปฏิบัติจริง 1 Run มีได้ 1 ถึงหลายสิบ Suite (Multi-Suite Run/Single-Suite
Run/Cross-Suite by Tag) หยุดแล้วถาม AskUserQuestion ใหม่ทันทีตามกฎ (ไม่เดาต่อเอง) ยืนยัน: (1) เปลี่ยนเป็น
`suiteId` เดี่ยว → `suiteIds: string[]` (เลือกได้หลาย Suite, Union Scenario จากทุก Suite ที่เลือกเข้าด้วยกัน,
Dedupe ด้วย Set เพราะ Scenario ซ้ำกันได้ระหว่าง Suite) (2) ชั้น "Test Case" (ย่อยกว่า Scenario, มี Test
Data/Steps/Expected Result เป็นของตัวเอง) **ยังไม่ทำตอนนี้** เก็บไว้เป็น Scope อนาคต (ดู
`REQ-notes/product-scope-smoke-test-only` memory ด้วย)

## Implementation & Verification Log

- [x] `lib/types.ts` — เพิ่ม `SUITE_PARTITION`, `SuiteEntity`/`SuiteDef`, `parseSuiteScenarioIds()`, เพิ่ม
  `RunEntity.suiteIdsJson`/`suiteNamesJson`/`scenarioIdsJson` (Optional ทั้งหมด — Run เก่าไม่มี Field พวกนี้ =
  ทดสอบทั้งไซต์เหมือนเดิม ไม่ต้อง Migrate)
- [x] `lib/azure/test-suites-table.ts` (Naming เจตนาไม่ใช้ `suites-table.ts` เพราะชนกับ `sites-table.ts` เดิมที่
  เป็นคนละเรื่อง — เสี่ยงสับสน) — `listSuites/getSuite/createSuite/updateSuite/deleteSuite`
- [x] หน้า Admin ใหม่ 3 หน้า `admin/suites/{page,new/page,[id]/edit/page}.tsx` (Checkbox เลือก Master
  Scenario เป็นสมาชิก Suite) + Link "จัดการ Suite" จากหน้า `admin/scenarios/page.tsx`
- [x] `lib/runs.ts` — เพิ่ม Helper `scopeScenarios()` ใช้ทั้งใน `getRunDetail()` และ `updateScenarioResult()`
  (จุดสำคัญ: ถ้าลืมจุดหลัง Gate จะไม่มีวันขึ้น READY เพราะนับ Scenario นอก Suite เป็น Not Run ค้างตลอด) —
  `createRun()` รับ `suiteIds` Array
- [x] `app/[site]/new/page.tsx` — เปลี่ยนจาก `<select>` เดี่ยวเป็น Checkbox List เลือกได้หลาย Suite (ไม่เลือกเลย
  = ทดสอบทั้งหมดเหมือนเดิม ไม่กระทบ E2E เดิมที่ไม่แตะ Field นี้), แสดงชื่อ Suite ทั้งหมดที่เลือก (Join ด้วย comma)
  ใน Subtitle หน้า Run Detail ถ้ามี
- [x] `npm run build` ผ่านสะอาด (ทั้งรอบ Single-suite และหลัง Refactor เป็น Multi-suite)
- [x] `npm run test:e2e` **24/24 ผ่านครบไม่มี Regression** (ทั้ง 2 รอบ — ก่อนและหลัง Refactor เป็น Multi-suite)
- [x] Manual/Puppeteer Verify เต็ม (พบ Bug ใน Script ตัวเองระหว่างทาง 2 จุด — Case-sensitivity Mismatch
  ระหว่าง `cleanId()` ของ ScenarioBoard ที่ Lowercase กับตัว Strip ของหน้า Admin ที่ไม่ Lowercase, และ Race
  Condition จาก Fixed-timeout แทนที่จะรอ PATCH Response จริง — แก้ Script ไม่ใช่ App แล้ว Confirm ผ่านหมด):
  สร้าง Scenario A/B/C → Suite1={A,B}, Suite2={B,C} → Clone ทั้ง 3 ไปไซต์ → Run เลือกทั้ง Suite1+Suite2
  พร้อมกัน ยืนยัน Union ถูกต้องเป๊ะ = {A,B,C} ไม่ซ้ำ (Dedupe ผ่าน) และ Subtitle แสดงชื่อ Suite ทั้งคู่ → Run
  เลือกแค่ Suite1 ยืนยันเห็นแค่ {A,B} ไม่มี C → กด Pass ทั้งคู่ยืนยัน Gate ขึ้น READY จริง (Reload ยืนยันซ้ำว่า
  Persist ที่ Server จริงไม่ใช่แค่ Optimistic UI) → Run ไม่เลือก Suite เลย ยืนยันเห็น Scenario ครบทุกตัวของไซต์
  รวม A/B/C ด้วย (Regression Check ทาง Default ผ่าน)
