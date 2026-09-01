# REQ-034: Stand up Site NUH + Verify Suite/Clone/Run End-to-End

**Status:** ✅ Done
**Priority:** P2 (verification/setup, not a code change)

## Context

หลัง Push REQ-032/033 ผู้ใช้ขอให้ทำ 3 ขั้นต่อไปทันที เพื่อพิสูจน์ว่าของทั้งหมดที่สร้างมาใช้งานได้จริงแบบ
End-to-end ผ่าน UI จริง (ไม่ใช่ผ่าน Script เรียก Function ตรงแบบ REQ-033):

1. สร้าง Preset Suites บน Master ผูกกับ MST-0001–MST-0017
2. ทดสอบ Clone Scenario จาก Master ไป Site NUH (ยืนยัน ID เดิม + Content ทำงานถูกต้อง)
3. สร้าง Test Run แรกบน Site NUH ทดสอบ Suite ∩ Tag filter จริง

ไม่มี Ambiguity ต้องถามเพิ่ม — Suite Membership คำนวณได้ตรงไปตรงมาจากข้อมูลที่มีอยู่แล้ว (`flow`/`tags`
ของ 17 Scenario ที่ Import ไปใน REQ-033):
- **"NUH Core Smoke Test"** = 10 Scenario ที่มี Tag `smoke` (ตรงกับ `critical: true` ทั้งหมดพอดี)
- **"OPD Journey"** = 4 Scenario ที่ `flow = OPD` (MST-0001–0004)
- **"IPD Full Lifecycle"** = 11 Scenario ที่ `flow = IPD` (MST-0005–0015)

ทำผ่าน UI จริงทั้งหมด (Puppeteer คลิกฟอร์มจริง ไม่เรียก Function ตรง) เพื่อพิสูจน์ End-to-end ตามที่ขอ —
Script อยู่ใน session scratchpad เท่านั้น ไม่ commit เข้า repo (เป็น Manual verification walkthrough
ไม่ใช่ Reusable seed script แบบ REQ-033)

ระหว่างทางเก็บกวาดข้อมูลทดสอบตกค้างจาก REQ-032 Manual Verification ไปด้วย (Site `REQ032B`, Suite
"REQ032 Verify Suite A/B" — 0 Scenario ทั้งคู่)

## Results

- **Site**: สร้าง `NUH` สำเร็จ
- **Suites**: สร้าง 3 Suite สำเร็จ — `SUT-0003` (NUH Core Smoke Test, 10), `SUT-0004` (OPD Journey, 4),
  `SUT-0005` (IPD Full Lifecycle, 11)
- **Clone**: Clone ทั้ง 17 Scenario จาก Master ไป Site NUH สำเร็จ — **ยืนยัน ID เดิมทุกตัว** (MST-0001
  ถึง MST-0017 เหมือน Master เป๊ะ ไม่มีการเปลี่ยนรูปแบบ) เนื้อหา (name/flow/critical/steps/criteria/tags)
  ตรงกับ Master ทุกฟิลด์
- **Run**: สร้าง `RUN-NUH-0001` สำเร็จ (Run แรกของ Site NUH, Sequential เริ่มที่ 0001 ถูกต้อง) — เลือก
  Suite "IPD Full Lifecycle" (11 Scenario) ∩ Tag "must not have: regression" → **ได้ผลลัพธ์ 7 Scenario
  พอดี (MST-0005, 0006, 0008, 0009, 0010, 0011, 0015)** ตรงกับที่คำนวณมือไว้ล่วงหน้าเป๊ะ (11 ตัด 4 ตัวที่
  มี Tag `regression` = 0007, 0012, 0013, 0014) — พิสูจน์ Logic Suite ∩ Tag ทำงานถูกต้อง 100%
- **Run Name**: ฟิลด์ใหม่จาก REQ-032 แสดงผลถูกต้องบนหน้า Run Detail ("NUH v2.7.0 IPD Full Lifecycle
  Smoke Test")
- **Dashboard**: 0 Pass / 0 Fail / 0 Block / 7 Not Run / 0% Pass Rate / ❌ NOT READY — ถูกต้องตามสภาพ
  Run ที่เพิ่งสร้าง ยังไม่มีใครกดผลอะไรเลย

## Verification Log

- [x] Site NUH สร้างสำเร็จ
- [x] 3 Suite ผูก Scenario ครบตามจำนวนที่คำนวณไว้ (10/4/11) ยืนยันผ่านหน้า List
- [x] Clone 17/17 สำเร็จ ID ตรงกับ Master ทุกตัว (screenshot ยืนยัน)
- [x] Run แรกของ Site NUH ได้ `RUN-NUH-0001` ตามลำดับ Running Number ที่ถูกต้อง
- [x] Suite ∩ Tag filter ให้ผลลัพธ์ถูกต้องตรงตามที่คำนวณด้วยมือ (7/11 Scenario)
- [x] Run Name (REQ-032) แสดงผลถูกต้องบน Run Detail
- [x] Dashboard/Gate แสดงผลถูกต้องตามสภาพ Run ที่เพิ่งสร้าง (screenshot ยืนยัน)
