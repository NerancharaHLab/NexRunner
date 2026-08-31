# REQ-012: Home page hero header

**Status:** ✅ Done
**Priority:** P3

## Context

หน้าแรก (`/`) เปลี่ยน "Smoke Test Runner" จาก Eyebrow เล็กเป็น H1 ตัวใหญ่ + เพิ่ม Tagline "Let's Run Some
Smoke Tests" ใต้ชื่อ เลือก Tagline จาก 3 ตัวเลือกผ่าน AskUserQuestion — **งานแรกที่ทำผ่านกฎเข้มใหม่
(EnterPlanMode + บันทึก TODO ก่อนเริ่มเสมอ แม้งานไฟล์เดียว)**.

## Implementation & Verification Log

- [x] แก้ `web/app/page.tsx` — เอา `.eyebrow` div เดิมออก ย้ายข้อความ "Smoke Test Runner" ขึ้นเป็น `<h1>`,
  เพิ่ม `<p className="subtitle">Let's Run Some Smoke Tests</p>`, คงบรรทัดคำแนะนำภาษาไทย
  "เลือกโรงพยาบาลเพื่อเริ่ม/ดูรอบทดสอบ" ไว้เป็นบรรทัดที่ 3 ด้านล่าง (ไม่แตะหน้าอื่นที่มีชื่อ "Smoke Test Runner"
  เช่น TopNav/Login — ขอบเขตแค่หน้าแรกเท่านั้น)
- [x] `npm run build` ผ่านสะอาด
- [x] Screenshot ยืนยัน Layout ใหม่ตรงตาม Plan ทุกจุด
