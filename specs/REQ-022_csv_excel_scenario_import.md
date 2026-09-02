# REQ-022: Import Scenarios via CSV/Excel

**Status:** 🚧 Phase 1 (backend core) done — no upload UI yet, Excel not started
**Priority:** P4 (ผู้ใช้ยืนยันย้ายไปทำสุดท้าย 2026-08-31)

## Context

ผู้ใช้ขอระหว่างที่กำลังวางแพลน User Management (REQ-004) พอดี บันทึกคิวไว้ก่อน — ทำหลัง Task Priority สูงกว่าเสร็จ
หมดก่อนตามที่ยืนยัน (2026-09-02).

## Decisions (ยืนยันครบแล้ว — user ให้ BA+SA brief แบบละเอียด, ผมตรวจกับโค้ดจริงก่อนรับ พบ+แก้ 3 จุด, user
confirm ให้ทำต่อ)

BA+SA brief ต้นฉบับ (สรุปสั้น): Onboarding เร็วขึ้นตอนเปิด Site ใหม่ (มี Test Matrix เดิมเป็น Spreadsheet
อยู่แล้ว), flow ต้องมี Template + Dry-run Preview + All-or-Nothing Commit, Create-only (ไม่มี Update),
Tag ต้อง Strict Match (ห้าม Auto-create), แยก Endpoint Master vs Site ชัดเจน.

**3 จุดที่ตรวจแล้วแก้ก่อนรับเข้าแผน:**
1. **Transaction composability ไม่มีอยู่จริงในโค้ดตอนนั้น** — `nextMasterScenarioId()`/
   `nextCustomScenarioId()`/`createScenario()` เดิม hardcode เรียกผ่าน global `prisma` client ตรง ๆ
   เอาไปยัดใน `prisma.$transaction()` ตรง ๆ แบบที่ brief สมมติไว้ไม่ได้จริง — ต้องแก้ให้รับ transaction
   client (`tx`) เป็น optional parameter ก่อน (ดู Implementation)
2. **"ป้องกัน ID Sequence Gap" ไม่ใช่ requirement จริงจาก REQ-032** — REQ-032 การันตีแค่ unique/monotonic/
   server-generated เท่านั้น ไม่เคยห้าม gap — ปรับเหตุผลของ Dry-run-first ให้ตรงกับสิ่งที่ระบบแคร์จริง คือ
   "ไม่เปลืองเลข sequence เปล่า ๆ ตอนไฟล์ผิด" ไม่ใช่ "ห้ามมี gap เด็ดขาด"
3. **ยังไม่มี CSV/Excel parser library ในระบบเลย** — Scope Phase 1 แค่ CSV เท่านั้น (ตรงกับที่ brief เองก็เขียน
   ว่า CSV เป็นหลัก) เลื่อน Excel (`.xlsx`, ต้องมี dependency แยกต่างหาก) เป็น Phase ถัดไป

**Phase 1 เป็น Backend-only ตามที่ user ยืนยัน** ("ทำต่อไปได้เลย" ต่อจากที่เสนอ scope นี้) — ยังไม่มี Upload UI,
ยังไม่มี Excel. Verify ด้วย script เรียกผ่าน function จริง (ไม่ bypass) แทน manual Puppeteer เพราะยังไม่มี UI
ให้กด.

## Implementation

- `package.json`: เพิ่ม `papaparse` + `@types/papaparse`
- `lib/db/id-sequence.ts`: เพิ่ม optional `db: Db = prisma` parameter ให้ `nextRunningNumber()` และ
  ไล่ผ่านไปยัง `nextMasterScenarioId()`/`nextSuiteId()`/`nextCustomScenarioId()`/`nextRunId()` —
  additive ล้วน ทุก call site เดิม (New Run, New Suite, New Site Custom Scenario ฯลฯ) ไม่ต้องแก้อะไรเลย
  เพราะ default เป็น global `prisma` client เหมือนเดิม
- `lib/db/scenarios-table.ts`: `createScenario()` เพิ่ม optional `db: Db = prisma` parameter เดียวกัน
- `lib/scenario-import.ts` (ใหม่) — 3 ฟังก์ชันหลัก แยกชัดเจนตาม stage:
  - `parseScenarioImportCsv(csvText)`: wrap `Papa.parse(csvText, { header: true, skipEmptyLines: true })`
  - `validateScenarioImportRows(raw, existingTags)`: pure function ไม่แตะ DB (caller ส่ง `listTags()`
    ผลลัพธ์เข้ามาเอง) — validate `name` (required เท่านั้น ตรงกับฟอร์มเดิมที่ required แค่ field เดียว),
    `flow` (case-insensitive match OPD/IPD/General, default OPD), `critical` (truthy/falsy
    true/false/1/0/yes/no), `tags` (คั่นด้วย `;`, resolve ผ่าน `sanitizeTagId()` เดิมเทียบกับ Tag Catalog
    จริง — ไม่เจอ = error ทันที ไม่ auto-create). คืน `{row, column, message}[]` โดย `row` นับรวม header
    (แถวข้อมูลแรกจริง = row 2 ตรงกับที่ user เห็นเปิดไฟล์ใน spreadsheet)
  - `commitScenarioImport(target, rows)`: รับเฉพาะ type ที่ validate แล้วเท่านั้น (เรียกด้วยข้อมูลดิบไม่ผ่าน
    การ validate ไม่ได้เลยในระดับ TypeScript) — ห่อทั้งหมดใน `prisma.$transaction()` เดียว, generate id
    ทีละแถวผ่าน `nextMasterScenarioId(tx)`/`nextCustomScenarioId(siteKey, tx)` ตาม target แล้วเรียก
    `createScenario(siteKey, {...row, id}, tx)` — ล้มแถวไหนแถวหนึ่ง Prisma rollback ทั้งหมดอัตโนมัติ รวมถึง
    เลข sequence ที่ loop ไปจองไว้ก่อนหน้าด้วย
- ยังไม่มี API route/Server Action ใหม่ (ไม่มี UI ให้เรียกตอนนี้) — ฟังก์ชันพร้อมให้ REQ ถัดไป (ทำ Upload UI)
  เรียกตรง ๆ จาก Server Action ได้เลย แบบเดียวกับ `lib/db/*.ts` ไฟล์อื่นทุกไฟล์ในระบบ

## Not done yet (future phases)

- Upload UI (ปุ่ม "Import from CSV" ที่ Master Library + Site Scenario Management, Template download,
  Preview Modal แสดง error รายแถวก่อนกด Confirm จริง)
- Excel (`.xlsx`) support
- API route/Server Action ที่เชื่อม UI เข้ากับ `commitScenarioImport()`

## Verification Log

- [x] `npm run build` clean (ทั้งไฟล์ใหม่และไฟล์ที่แก้)
- [x] `npm run test:e2e` 27/27 — ไม่มี behavior เปลี่ยนสำหรับ call site เดิมทั้งหมด (optional parameter
  ล้วน)
- [x] Script (ไม่ commit) เรียกผ่าน function จริง ยืนยันครบ: valid 3-row CSV (Master target) commit
  สำเร็จ ได้ id `MST-XXXX` จริง 3 อัน field ตรง (รวม flow case-fix `ipd`→`IPD` และ default เมื่อว่าง);
  แถวขาด `name` ถูก reject พร้อมระบุ row/column ถูกต้อง (row 3 ตรงกับที่นับรวม header); **ยืนยัน MST
  sequence counter ไม่ขยับเลยสำหรับไฟล์ที่ reject** (พิสูจน์ dry-run-first ไม่เปลืองเลขจริง); tag ที่ไม่มีใน
  Catalog ถูก reject พร้อมชื่อ tag ที่ไม่รู้จัก และยืนยันไม่มี Tag ถูก auto-create; ค่า `flow` ที่ไม่ตรง enum
  ถูก reject; import เข้า Site (ไม่ใช่ Master) ได้ id scheme `{SITE}-CUST-NNNN` ถูกต้อง และ `sourceSite`
  auto-set เป็น site เอง (เพิกเฉยค่าที่ใส่มาในไฟล์ ตามที่ตั้งใจ)
- [x] เก็บกวาดข้อมูลทดสอบครบ (ลบ Scenario ที่สร้างระหว่าง verify, ยืนยัน Tag Catalog ไม่มี tag แปลกปลอมจาก
  script)
