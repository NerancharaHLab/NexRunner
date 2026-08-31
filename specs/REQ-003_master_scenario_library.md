# REQ-003: Master Scenario Library + Clone-to-Site

**Status:** ✅ Done
**Priority:** P1

## Context

ผู้ใช้ขอให้ Scenario ใช้ซ้ำได้หลาย รพ. ยืนยันผ่าน AskUserQuestion เป็นแบบ **Clone + Master** (ไม่ใช่
Live-shared/Many-to-many): แก้ที่ Master แล้วแต่ละ รพ. ต้องกด Re-clone เองถึงจะได้ของใหม่ (ทับของเดิม), ไม่
Sync อัตโนมัติ.

## Implementation & Verification Log

- [x] `lib/types.ts` — เพิ่ม `MASTER_SCENARIO_PARTITION = "__MASTER__"` (Reuse Scenarios Table เดิม ไม่สร้าง
  Table ใหม่ ใช้ Partition Key สงวนที่ชนกับ Site จริงไม่ได้)
- [x] `lib/azure/scenarios-table.ts` — เพิ่ม `cloneScenario(fromPartition, toPartition, scenarioId)` (อ่านจาก
  `getScenario` เดิม เขียนด้วย `createScenario` เดิมที่ Upsert แบบ Replace อยู่แล้ว = ทับของเดิมได้ในตัว ไม่ต้อง
  เขียน Logic ใหม่)
- [x] หน้า Admin ใหม่ 3 หน้า: `admin/master-scenarios/{page,new/page,[id]/edit/page}.tsx` (ก็อปโครงจาก
  `admin/scenarios/[site]/**` เดิม แต่แยกไฟล์เพราะหน้าเดิม Lookup `getSite()` จริง ซึ่ง `__MASTER__` ไม่ใช่ Site
  จริงและห้ามโผล่ในหน้าเลือก รพ. ปกติ) Gate ด้วย `requireRole(CAN_EDIT_CONTENT)` เท่ากับสิทธิ์แก้ Scenario ปกติ
- [x] Link เข้าถึง Master Library จากหน้า `admin/scenarios/page.tsx` (หน้าเลือก รพ. เดิม)
- [x] หน้า Clone `admin/scenarios/[site]/clone-from-master/page.tsx` — Checkbox เลือก Master Scenario หลายตัว
  + ปุ่ม Clone ไปยัง รพ. ปัจจุบัน (แจ้งเตือนถ้ามีอยู่แล้วจะโดนทับ ด้วย Badge "มีอยู่แล้ว — Clone ทับ") + Link
  เข้าถึงจากหน้า List Scenario ของแต่ละ รพ.
- [x] `npm run build` ผ่านสะอาด — Route ใหม่ทั้ง 4 ขึ้นครบ
- [x] `npm run test:e2e` — เจอ 3 Spec Fail ตอนแรก (`01-auth`, `08-admin-user-crud`, `09-change-password`) แต่
  **ไม่ใช่ Regression จากงานนี้** สาเหตุจริงคือ Assertion เดิมเช็ค H1 `"เลือกโรงพยาบาล"` ที่หน้าแรกซึ่งเปลี่ยนเป็น
  `"Smoke Test Runner"` ไปแล้วตั้งแต่งาน Hero Header ก่อนหน้า (พลาดไม่ได้อัปเดต E2E ตอนนั้น) แก้ไข Assertion
  ทั้ง 3 จุดให้ตรงกับข้อความปัจจุบันแล้ว รันซ้ำผ่านครบ **24/24**
- [x] Manual/Puppeteer Verify Flow เต็ม — สร้าง Master → Clone ไปไซต์ E2E → แก้ไขที่ไซต์ E2E เป็น
  "SITE-DIVERGED-NAME" (แยกอิสระ) → ยืนยัน Master ยังเป็น "V1" เดิมไม่กระทบ → แก้ Master เป็น "V2 UPDATED" →
  หน้า Clone Picker แสดง Badge "มีอยู่แล้ว — Clone ทับ" ถูกต้อง → Re-clone ไซต์ E2E ซ้ำ → ยืนยันไซต์ E2E ได้
  "V2 UPDATED" จริง (ทับ "SITE-DIVERGED-NAME" เดิม) — ผ่านครบทุกขั้นตอนตรงตาม Spec
