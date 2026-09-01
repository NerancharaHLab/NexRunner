# REQ-033: Seed NUH Cortex v2.7.0 Master Scenario Library

**Status:** ✅ Done
**Priority:** P1 (real content, not a system feature — first real Master Scenario Library data)

## Context

ผู้ใช้ส่งชุดข้อมูล Master Scenario 17 รายการ (`MST-0001`–`MST-0017`) สำหรับ NUH Cortex v2.7.0 มาให้ Import
เช็คกับระบบจริงก่อน (ตามกฎ "ห้ามเชื่อ spec จากภายนอกโดยไม่ตรวจกับโค้ดจริงก่อน") พบ 3 จุดขัดกับสถาปัตยกรรมที่
เพิ่งวางไว้ใน REQ-032 — รายงานกลับและได้รับการฟันธงแนวทางแก้ครบทั้ง 3 จุดแล้ว:

### 1. ID ชนกับ REQ-032 (System-generated ID)
ไฟล์กำหนด `id` ตายตัวมาเอง แต่ระบบบังคับ Master Scenario id เป็น System-generated ล้วน (ไม่มีช่องกรอกใน
ฟอร์มแล้ว) และ DB จริงตอนนี้มี `MST-0001`/`MST-0002` ถูกใช้ไปแล้วโดยข้อมูลทดสอบตอน Verify REQ-032
("REQ032 Verify Master A/B") — ชนตรง ๆ

**ฟันธง**: ลบ 2 แถวทดสอบทิ้ง + Reset Counter `"MST"` กลับเป็น 0 แล้ว Import ทั้ง 17 รายการผ่าน
`createScenario()` ตามลำดับจริง (ไม่ Bypass) ให้ระบบ Generate `MST-0001`–`MST-0017` เองจาก Counter
ตามกลไก REQ-032 ปกติ — Counter จบที่ 17 ถูกต้อง ครั้งต่อไปที่กด "+Add Scenario" จะได้ `MST-0018` ไม่ชน

### 2. Tag Catalog ว่างเปล่า + รูปแบบไม่ตรง sanitizeTagId()
Tag ทั้ง 34 ตัวในไฟล์ (นำหน้าด้วย `@`) ยังไม่มีใน Tag Catalog เลย และ `sanitizeTagId()` ของระบบตัด
อักขระ `@` ทิ้งอัตโนมัติ ทำให้ Import ตรง ๆ จะไม่ match กับ Tag Catalog จริง

**ฟันธง**: สร้าง Tag ทั้ง 34 ตัวก่อน (ตัด `@` ออกให้ตรง `sanitizeTagId()`) แล้วค่อยผูกเข้า Scenario แต่ละตัว
รายการ Tag ที่ยืนยันแล้ว (ตรวจสอบแล้วครบตรงกับที่ใช้จริงใน 17 Scenario ทั้งหมด, 34 ตัว):
`smoke, critical, regression, opd, ipd, general, registration, vital-signs, doctor-emr,
drug-allergy, order-entry, lab, radiology, pharmacy, cashier, billing, stateful, admit,
bed-management, an-creation, nurse-ward, bed-transfer, physician-order, order-verification, emar,
continue-order, nurse-note, interim-billing, discharge, bed-release, report, read-only, coder,
icd-coding`

### 3. Field ที่ไม่มีใน Schema (`legacyId`, `system`/`version` ระดับไฟล์)
- **`legacyId`** (เช่น `SC-01`, `SC-02 [A]`) — ไม่เพิ่ม Schema ใหม่ (เลี่ยง Migration overhead) ฟันธงให้ใส่
  เป็น Prefix ในฟิลด์ `name` แทน เช่น `"[SC-01] NUH: ลงทะเบียน คัดกรอง ก่อนเข้าตรวจ OPD"` — ค้นหาง่าย
  เทียบเอกสารเก่าได้ทันทีโดยไม่ต้องแก้ DB
- **`system`/`version`** (`"Cortex HIS"`, `"2.7.0"`) — ไม่เก็บที่ระดับ Master Scenario เพราะ Version เป็น
  Context ของ Test Run/Release อยู่แล้ว (field `version` มีอยู่ที่ `Run` ไม่ใช่ `Scenario`)

### 4. จำนวน Scenario
ไฟล์เขียน `"totalScenarios": 16"` แต่มี 17 รายการจริง — ยืนยันแล้วว่าตั้งใจ 17 รายการ (SC-02 เดิมถูกแยกเป็น
2 Master Scenario อิสระ: `[A]` OPD Order และ `[B]` IPD Admit ซึ่งถูกต้องแล้ว) — Import ครบ 17

## Implementation

หนึ่ง one-off seed script (`temp_scripts/seed_nuh_cortex_master_scenarios.ts`, pattern เดียวกับ
`temp_scripts/seed_scenarios_and_sites.ts`) เรียกผ่าน `lib/db/*` functions จริง (`deleteScenario`,
`createTag`, `createScenario`) ไม่เขียน SQL ตรงยกเว้นจุดเดียวคือ reset `IdSequence.value` ของ scope
`"MST"` กลับเป็น 0 (ไม่มี helper function สำหรับ reset counter ในระบบ เพราะไม่ใช่ operation ปกติที่แอปควรทำเอง
— เป็น one-off maintenance เท่านั้น)

เนื้อหา 17 Scenario (name/desc/role/flow/critical/steps/criteria) คัดลอกมาจากข้อความที่ผู้ใช้ส่งมาตรงตัว
ทุกตัวอักษร ไม่มีการแต่ง/ย่อ/แปลเพิ่มเอง — เปลี่ยนแค่ 2 อย่างตามที่ฟันธง: (1) ตัด `@` ออกจาก tags, (2) เติม
`[legacyId]` นำหน้า `name`

## Verification Log

- [x] MST-0001 ถึง MST-0017 ถูกสร้างจริง ครบ 17 แถว — เช็คตรง Postgres (`flow`/`critical`/`tag_count`
  ทุกแถวตรงกับไฟล์ต้นฉบับ 100%, สุ่มตรวจ `tag_count` เทียบ raw JSON ผ่านหมด: MST-0001=5, MST-0002=6,
  MST-0004=7, MST-0010=7, MST-0015=8, MST-0016=3, MST-0017=4)
- [x] Tag Catalog มีครบ 34 ตัว ตรงตาม `sanitizeTagId()` convention (ตัด `@` ออกหมดแล้ว)
- [x] `IdSequence` scope `"MST"` = 17 หลัง Import — "+Add Scenario" ตัวถัดไปจะได้ `MST-0018` ไม่ชน
- [x] Manual Puppeteer verify ผ่านหน้า Admin: Master Scenario List แสดงครบ 17 รายการ (screenshot),
  เปิด `MST-0002` (`SC-02 [A]`) Edit ตรวจ Steps เต็ม 647 ตัวอักษรไม่ขาด, Tag ผูกถูกทั้ง 6 ตัว
  (`critical, doctor-emr, drug-allergy, opd, order-entry, smoke`), ช่อง ID เป็น Read-only `<div>`
  ตาม REQ-032 (ไม่ใช่ `<input>`)
