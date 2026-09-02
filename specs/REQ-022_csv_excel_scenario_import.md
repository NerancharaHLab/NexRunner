# REQ-022: Import Scenarios via CSV/Excel

**Status:** 🚧 Phase 1 + Phase 2 (backend + Upload UI) done — Excel not started
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

## Phase 2 — Upload UI (ยืนยันครบแล้ว, user ให้ BA+UI+SA brief แบบละเอียดพร้อม workflow diagram, ผมตรวจกับ
โค้ด/doc จริงก่อนรับ พบ+แก้ 2 จุด, user confirm ให้ทำต่อ)

**2 จุดที่ตรวจแล้วแก้ก่อนรับเข้าแผน:**
1. **Route/label ผิด** — brief อ้าง `/[site]/scenarios` กับปุ่ม "+ Custom Scenario" แต่ path จริงคือ
   `/admin/scenarios/[site]` และทั้งสองหน้าใช้ label เดียวกันคือ **"+ Add Scenario"** (เช็คจากไฟล์จริงทั้งคู่)
   — วางปุ่ม Import คู่กับปุ่มจริงตามที่ตั้งใจ แค่แก้ path/label
2. **Next.js Server Action body size limit ชนกับ limit ที่ brief ตั้งเอง** — เช็ค Next.js 16 doc ที่ bundle
   มากับโปรเจกต์ยืนยันว่า default คือ **1MB** เท่านั้น (brief เขียนไม่ฟันธงว่า "1MB หรือ 4MB") ซึ่งชนกับ
   limit 2MB ที่ brief กำหนดเองตรง ๆ — แก้โดยเพิ่ม `experimental.serverActions.bodySizeLimit: '2mb'` ใน
   `next.config.ts` จริง

**ส่วนเสริมที่ไม่ได้อยู่ใน brief แต่จำเป็น**: ระบบนี้ไม่เคยมี Toast/Notification component มาก่อนเลย (เช็คแล้ว)
— ใช้ pattern ที่มีอยู่แล้วแทน (redirect พร้อม `?imported=...` searchParam แล้วโชว์ `.success-banner`
ใหม่ ที่ style คู่กับ `.error-banner` เดิม) แทนการสร้าง Toast widget ใหม่ทั้งระบบ — บันทึกไว้ให้เห็นชัดว่าเป็น
การ substitute ไม่ใช่ silently เปลี่ยนโดยไม่บอก

## Implementation (Phase 2)

- `next.config.ts`: เพิ่ม `experimental.serverActions.bodySizeLimit: '2mb'`
- `public/scenario_import_template.csv` (ใหม่, static file ธรรมดา ไม่ต้องมี route handler) — header
  ตรงกับที่ parser คาดหวังเป๊ะ (`name,flow,role,critical,steps,criteria,tags,sourceSite`) + ตัวอย่าง 2
  แถวภาษาไทย ยืนยันแล้วว่า tag ตัวอย่าง (`smoke`, `critical`) มีอยู่จริงใน Tag Catalog ของระบบนี้
- `lib/actions/scenario-import-actions.ts` (ใหม่, `"use server"`) — โค้ด server ใหม่ที่เดียวของ Phase นี้:
  - `previewScenarioImportAction(target, formData)`: `requireRole(CAN_EDIT_CONTENT)`, บังคับ limit
    2MB/100 แถวฝั่ง server (ไม่เชื่อ client-side check อย่างเดียว), เรียก `parseScenarioImportCsv` +
    `validateScenarioImportRows(raw, await listTags())` คืน `{validRows, errors, totalCount}`
  - `confirmScenarioImportAction(target, rows)`: `requireRole(CAN_EDIT_CONTENT)`, กัน `rows` ว่าง/เกิน
    limit อีกชั้น แล้วเรียก `commitScenarioImport(target, rows)`
- `app/admin/ScenarioImportModal.tsx` (ใหม่, Client Component ใช้ร่วมกันทั้ง 2 หน้า ผ่าน `target` prop)
  — Drag & Drop + Browse file → preview (error list ถ้ามีปัญหา, บังคับแก้ไฟล์ต้นฉบับแล้ว re-upload ไม่มี
  inline edit ตามที่ confirm ไว้ / preview table ถ้าผ่านหมด) → Confirm → `router.push()` กลับไปหน้าเดิม
  พร้อม `?imported=&firstId=&lastId=` (trigger ทั้ง revalidate และ success banner)
- `app/admin/master-scenarios/page.tsx`, `app/admin/scenarios/[site]/page.tsx`: เพิ่มปุ่ม "Import CSV"
  คู่กับ "+ Add Scenario" เดิม + render `<ScenarioImportModal>` + อ่าน `?imported=` แสดง
  `.success-banner`
- `app/globals.css`: เพิ่ม `.success-banner` (mirror `.error-banner`, ใช้ `--pass-bg`/`--pass-color`)

## Not done yet (future phases)

- Excel (`.xlsx`) support — ยังไม่เริ่ม

## Verification Log

- [x] `npm run build` clean (Phase 1 + Phase 2 ทั้งหมด)
- [x] `npm run test:e2e` 27/27 (ทั้งสองรอบ — หลัง Phase 1 และหลัง Phase 2)
- [x] Phase 1: Script (ไม่ commit) เรียกผ่าน function จริง ยืนยันครบ: valid CSV commit สำเร็จ ได้ id
  `MST-XXXX` จริง field ตรง; แถวขาด `name` ถูก reject พร้อม row/column ถูกต้อง; **ยืนยัน MST sequence
  counter ไม่ขยับเลยสำหรับไฟล์ที่ reject**; tag ที่ไม่มีใน Catalog ถูก reject ไม่ auto-create; `flow` ผิด
  enum ถูก reject; Site target ได้ id scheme `{SITE}-CUST-NNNN` ถูกต้อง `sourceSite` auto-set
- [x] Phase 2: Manual Puppeteer ผ่านเว็บจริงครบ 9 จุด (site ทดสอบแยก, ลบทิ้งหลังเสร็จ): Template
  download header ตรงกับที่ parser คาดหวังเป๊ะ; Master target — upload CSV ถูกต้อง 2 แถว → preview
  "All 2 rows valid" → Confirm → success banner โชว์ id range ถูกต้อง (`MST-0023 – MST-0024`) →
  scenario ใหม่ขึ้นในหน้า list ทันทีไม่ต้อง refresh มือ; upload CSV ที่มีทั้งแถวขาด name และ tag ที่ไม่มีจริง
  → preview โชว์ error ทั้งคู่ถูกต้อง (row/column ตรง) → ไม่มีปุ่ม Confirm ให้กด มีแค่ Re-upload; upload
  ไฟล์ 101 แถว → ถูก reject ฝั่ง server จริง (ไม่ใช่แค่ client-side guess) ยืนยัน `bodySizeLimit` config มีผล
  จริง; Site target — upload พร้อม `sourceSite` column ที่ตั้งใจให้ผิด → ระบบเพิกเฉยค่านั้นจริง ใช้ site
  เองแทน ได้ id `{SITE}-CUST-0001` ถูกต้อง; qa_engineer ถูก redirect ออกจากหน้าเลย (feature inherit
  page-level gate เดิม)
- [x] เก็บกวาดข้อมูลทดสอบครบทั้ง Phase (ลบ Scenario/Site/temp CSV file ที่สร้างระหว่าง verify)
