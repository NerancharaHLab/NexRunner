# REQ-013: Differentiate Home Site Picker from Admin Scenario Site Picker

**Status:** ✅ Done
**Priority:** P2

## Context

แยกหน้า Site Picker หลัก (`/`) กับหน้าเลือกไซต์ของ "จัดการ Scenario" (`/admin/scenarios`) ให้ดูต่างกันชัดขึ้น
— เสนอ 4 แนวทางผ่าน AskUserQuestion ผู้ใช้เลือก "เปลี่ยน Layout หน้า Admin เป็น List/Table กะทัดรัด" (หน้าแรก
คงเป็น Grid Card ใหญ่เหมือนเดิม).

## Implementation & Verification Log

- [x] เปลี่ยน `app/admin/scenarios/page.tsx` จาก `.site-grid`/`.site-tile` เป็น `<table
  className="data-table">` (คอลัมน์ โรงพยาบาล/ไซต์ + ปุ่ม "จัดการ Scenario →")
- [x] เพิ่ม CSS Class `.site-mark` แบบ Standalone ใน `globals.css` (ของเดิม `.site-tile-mark` Scope ไว้เฉพาะ
  ใต้ `.site-tile` เท่านั้น ใช้นอก Context เดิมไม่ได้ ต้องแยก Class ใหม่)
- [x] เปลี่ยน `data-testid` จาก `tile__` เป็น `row__`/`link-manage__` ให้ตรงกับ Convention ตาราง (เช็คแล้วไม่มี
  E2E Spec ไหนอ้างอิง `tile__` เดิม ปลอดภัยที่จะเปลี่ยน)
- [x] `npm run build` สะอาด, `npm run test:e2e` 24/24 ผ่าน, Screenshot เทียบ 2 หน้าคู่กันยืนยันแยกออกจากกัน
  ชัดเจนแล้ว
