# REQ-036: Master Scenario Library — Origin Site (`sourceSite`) field

**Status:** ✅ Done
**Priority:** P2 (Traceability / Cross-site reuse)

## Context

ผู้ใช้เสนอ: Master Scenario Library ควรระบุได้ว่าแต่ละ Scenario "มาจาก" Workflow ของโรงพยาบาลไหน เพื่อให้
ตอน Clone ไป Site ใหม่ รู้ว่าจะหยิบ "ชุดของ NUH" หรือ "ชุด Core/Global มาตรฐานกลาง" — เช็คแล้วไม่มี REQ
เดิมคุมเรื่องนี้ และเป็นช่องโหว่จริง (หน้า Clone-from-Master ตอนนี้เป็น List แบนราบ ไม่มีการจัดกลุ่ม/กรองเลย)

## Decisions (ยืนยันครบแล้ว หลังถกกันหลายรอบ)

1. **`sourceSite` เป็น Free-text Field** (ไม่ผูก FK กับตาราง Sites จริง) — Filter Dropdown หน้า Clone
   ดึงจาก `DISTINCT sourceSite` ที่มีอยู่จริงในข้อมูล โตขึ้นเองตามการใช้งาน
2. **Normalize ฝั่ง Server ทุกครั้งที่บันทึก**: `.trim().toUpperCase()` — กัน Data Fragmentation
   (`"nuh"`/`"NUH "`/`"Nuh"` ต้องรวมเป็น `"NUH"` เดียว) หน้าบ้านยังเป็น Free-text ปกติ
3. **Default = `'CORE'` คำเดียว** (ปฏิเสธ `'GLOBAL'` เป็นคำพ้องความหมายโดยเจตนา — ป้องกันปัญหาเดียวกับ
   ข้อ 2) ใช้เมื่อไม่กรอกตอนสร้าง (Optional ไม่บังคับ)
4. **Backfill 17 Master Scenario เดิม (จาก REQ-033) เป็น `'NUH'` ตรงตามข้อเท็จจริง** ไม่ใช่ Default กลางๆ
5. **หมายเหตุสถาปัตยกรรม (บันทึกไว้กันงงย้อนหลัง)**: ไม่ใช่การกลับคำตัดสินใจ REQ-033 ที่ปฏิเสธเก็บ
   `system`/`version` ที่ระดับ Scenario — `version` เป็น **Temporal/Execution Context** (เปลี่ยนตาม
   Release ผูกกับ Run) ส่วน `source_site` เป็น **Immutable Origin Fact** (ที่มาของ Workflow ไม่เปลี่ยนตาม
   เวลา) คนละมิติกันชัดเจน
6. **ส่วนเสริมนอก Spec เดิม** (Low-risk, สมเหตุสมผล): Site Custom Scenario (`admin/scenarios/[site]/new`)
   Auto-set `sourceSite` เป็น Site id ของตัวเองอัตโนมัติ ไม่มีฟอร์มให้กรอก (เพราะ Scenario ที่สร้างตรงที่ Site
   ก็ "มาจาก" Site นั้นอยู่แล้วโดยนิยาม)

## Implementation

- Schema: `Scenario.sourceSite String @default("CORE")` (ใช้ร่วมทั้ง Master และ Site-cloned copies —
  `cloneScenario()` พา sourceSite ติดไปด้วยอัตโนมัติ ไม่ต้องแก้โค้ดเพิ่ม)
- `lib/types.ts`: เพิ่ม `sourceSite` ใน `ScenarioDef`/`ScenarioEntity`
- `lib/db/scenarios-table.ts`: `createScenario()` ทำ Normalize + Default ที่จุดเดียว
  (`input.sourceSite?.trim().toUpperCase() || "CORE"`)
- UI: ไม่เพิ่ม Client Component ใหม่ ใช้ GET Query Param Filter (`?source=NUH`) ธรรมดา — Text Input ที่
  ฟอร์ม Create/Edit Master Scenario, Badge + Filter Dropdown ที่หน้า List และหน้า Clone-from-Master
- Migration + Backfill: `npm run db:migrate` แล้ว `UPDATE scenarios SET "sourceSite"='NUH' WHERE
  "siteKey"='__MASTER__'` (รันตรงผ่าน psql ครั้งเดียว ไม่ commit เป็น Script เพราะเป็นการแก้ข้อมูลครั้งเดียว)

## บั๊กที่พบระหว่าง Implement (แก้แล้ว)

**TypeScript ไม่ Narrow `scenario` ข้าม Server Action Closure** — หน้า Edit Site Custom Scenario มี
`if (!scenario) notFound()` guard ตามปกติ แต่พอเข้าถึง `scenario.sourceSite` ใน Nested Server Action
(`async function updateScenarioAction`) TS ฟ้อง `possibly undefined` เพราะ Closure ที่ Next.js อาจ
เรียกใหม่คนละ Request ทำให้ TS ไม่เชื่อ Narrowing เดิม — แก้โดย Capture ค่าออกมาเป็นตัวแปรใหม่
(`const currentSourceSite = scenario.sourceSite`) ก่อนนิยาม Closure

## Verification Log

- [x] `npm run build` ผ่านสะอาด
- [x] `npm run test:e2e` 24/24
- [x] DB: 17 Master Scenario เดิมมี `sourceSite='NUH'` ครบหลัง Backfill (Master + Site NUH ที่ Clone
  ไปแล้วตอน REQ-034 ก็ Backfill ตามด้วยเพื่อความ Consistent)
- [x] Manual Puppeteer ยืนยันครบ: สร้าง Master Scenario ใหม่เว้น sourceSite ว่าง → ได้ `CORE` จริง
  (ยืนยันตรง DB), พิมพ์ `"  nuh  "` (ตัวเล็ก มี Space) → บันทึกเป็น `NUH` ถูกต้อง (Normalize ทำงาน),
  Filter Dropdown ที่หน้า Master Library กรอง CORE/NUH ได้ผลลัพธ์ถูกต้อง (ซ่อน/แสดงตรงตาม sourceSite),
  หน้า Clone-from-Master กรองตาม NUH ได้ผลลัพธ์ถูกต้อง (Screenshot ยืนยัน Badge NUH ครบทุกแถว, ซ่อน
  Scenario สาย CORE ออกถูกต้อง), Site Custom Scenario ใหม่บน NUH ได้ `sourceSite='NUH'` อัตโนมัติ
  (ยืนยันตรง DB ไม่มี Field ให้กรอกในฟอร์ม)
- [x] เก็บกวาดข้อมูลทดสอบ (2 Master + 1 Site Custom) หลัง Verify เสร็จ
