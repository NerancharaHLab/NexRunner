# REQ-035: Manage Tags UX Redesign — Usage Count + Safe Delete + Search + Pagination + Sort

**Status:** ✅ Done
**Priority:** P2 (UX + Data Safety)

## Context

ผู้ใช้ส่ง Mockup เสนอปรับปรุงหน้า `/admin/tags`: Badge/Pill styling, Usage Count column, Safe Delete
guard, Search box, Quick stats bar เช็คกับโค้ดจริงก่อน — ทุกจุดที่เสนอมาตรงกับปัญหาจริง และเจอเพิ่มอีกจุด:
**`deleteTag()` ตอนนี้ไม่มี Cascade/Safety check เลย** — ลบ Tag ที่กำลังถูกใช้อยู่ ปล่อย Orphaned string
ค้างใน `Scenario.tags` ของทุก Scenario ที่เคยผูกไว้แบบไม่มีใครรู้

## Decisions (ยืนยันแล้ว)

1. **Usage Count scope: นับเฉพาะ Master Scenario Library เท่านั้น** (ไม่รวม Site ที่ Clone ไป) —
   สอดคล้องกับ Subtitle ของหน้านี้เอง ("attach to Master Scenarios") และ Query เร็วกว่า (Scan ตารางเดียว)
2. **Delete เมื่อ Usage > 0: Hard Block** (ไม่ใช่ Cascade) — สอดคล้องทิศทาง Compliance/Audit-safety ของ
   ทั้ง Session (REQ-030/031/032) ไม่ให้ Action หนึ่งไปแก้ข้อมูลที่อื่นแบบเงียบ ๆ Copy ข้อความ Modal ตามที่
   ผู้ใช้ระบุเป๊ะ: "Cannot Delete Tag" / "Tag นี้กำลังถูกใช้งานอยู่ใน N Master Scenarios" / "กรุณาปลด Tag นี้
   ออกจาก Scenario ที่เกี่ยวข้องทั้งหมดก่อนจึงจะสามารถลบได้"
3. เพิ่ม Confirmation Modal แม้กรณี Usage = 0 (ลบได้) ด้วย ตามที่เสนอมาในสเปกเดิม — ใช้ Pattern
   `.modal-overlay`/`.modal-card` เดียวกับ "Pass All Remaining" ใน ScenarioBoard.tsx

## Implementation

- `lib/db/tags-table.ts`: เพิ่ม `getTagUsageCounts()` (Query ครั้งเดียว Scan Master scenarios ทั้งหมด
  แล้วนับใน JS — ไม่ใช่ Raw SQL), `TagInUseError`, Guard ใน `deleteTag()` (Server-side enforcement,
  Pattern เดียวกับ `SiteHasRunsError` ใน `sites-table.ts`)
- `app/admin/tags/page.tsx`: Fetch usage counts, catch `TagInUseError`
- `app/admin/tags/TagsTable.tsx` (ใหม่, Client Component): Search (Client-side filter), Stats bar,
  Pill styling, Modal ทั้ง 2 แบบ, ปุ่ม Delete Disabled/Active ตาม Usage
- `globals.css`: `.tag-pill` (ใช้ `border-radius: 100px` Convention ที่มีอยู่แล้วในระบบ)

ไม่มี Schema change / Migration

## Follow-up ระหว่าง Session เดียวกัน (เพิ่ม Pagination + Sort)

หลังปิดจบรอบแรก ผู้ใช้ขอเพิ่มอีก 2 อย่างในหน้าเดิม — เป็นงานเล็กต่อยอด Component ที่เพิ่งสร้าง ทำต่อทันที
ไม่ต้องผ่าน Planning cycle ใหม่ (ชัดเจน ไม่มี Ambiguity):

- **Pagination**: Default 10 รายการ/หน้า ปรับได้ (10/25/50/100) ผ่าน Dropdown "Show [N] per page" +
  ปุ่ม Prev/Next + "Page X of Y" — เปลี่ยน Search/Page Size/Sort กลับไปหน้า 1 เสมอ (กัน "หน้าว่าง" หลัง
  กรอง/เรียงใหม่)
- **Column Sort**: คลิก Header "Tag Name" หรือ "Usage" เพื่อเรียง คลิกซ้ำสลับ Ascending/Descending มี
  ลูกศร ↑/↓ บอกสถานะ

## บั๊กที่เจอระหว่าง Implement (แก้แล้ว)

**Native `disabled` button ทำให้เปิด Blocked Modal ไม่ได้เลย** — Implement รอบแรกใช้ HTML attribute
`disabled` จริงตามที่ Mockup สื่อว่า "ปุ่มสีเทา" แต่ Browser ไม่ยิง `onClick` ให้ Element ที่ `disabled`
เลย (พฤติกรรมมาตรฐานของ DOM) ทำให้ "กดแล้วขึ้น Blocked Modal" เป็นไปไม่ได้จริงถ้าใช้ `disabled` ตรงๆ —
เจอตอน Manual Verify (Puppeteer คลิกแล้ว Modal ไม่ขึ้น) แก้โดยเปลี่ยนเป็น CSS Class
`.btn-danger-text--blocked` (สีเทา + cursor not-allowed ให้*ดู*เหมือน Disabled) แต่ปุ่มยังเป็น Real
Button ที่คลิกได้จริงเพื่อเปิด Modal อธิบายเหตุผล — Pattern นี้เป็นวิธีมาตรฐานที่ Design System อื่นใช้
เพื่อแก้ปัญหานี้เหมือนกัน (Informative-disabled แทน True-disabled)

## Verification Log

- [x] `npm run build` ผ่านสะอาด
- [x] `npm run test:e2e` 24/24 (ไม่มี Spec เดิมแตะ `/admin/tags` — เช็คแล้ว ไม่กระทบ)
- [x] Manual Puppeteer (ยืนยันครบทุกจุดพร้อม Screenshot):
  - Stats bar ถูกต้อง ("Total: 34 Tags · 34 Active")
  - Search filter "smoke" → เหลือ 1 แถวถูกต้อง
  - Tag `smoke` (Usage 10) → ปุ่ม Delete เป็นสีเทา (Blocked style) + Tooltip "Cannot delete: used by
    10 scenarios" ถูกต้อง กดแล้วขึ้น Blocked Modal พร้อมข้อความไทยตามที่ระบุเป๊ะ ไม่ลบจริง
  - Tag ใหม่ที่ Usage=0 → ปุ่ม Delete เป็นสีแดงปกติ (Active) กดแล้วขึ้น Confirm Modal → กด "Yes, Delete"
    → ลบสำเร็จจริง (ยืนยันแถวหายจากตาราง)
  - Screenshot ยืนยันความต่างสี Delete Button ระหว่าง Row ปกติ (แดง) กับ Row ที่ถูก Block (เทา) ชัดเจน
  - Pagination: Default 10 แถว/หน้า, "Page 1 of 4" (34 Tags) ถูกต้อง, กด Next ไปหน้า 2 ได้, Prev
    Enable ถูกต้อง, เปลี่ยน Page Size เป็น 50 → เห็นครบ 34 แถวในหน้าเดียว "Page 1 of 1", ปุ่ม Next
    Disable ถูกต้องเมื่อไม่มีหน้าถัดไป
  - Sort: คลิก Header "Usage" ครั้งแรก → เรียงจากน้อยไปมากถูกต้อง (1,1,1,...), คลิกซ้ำ → มากไปน้อยถูกต้อง
    (11,10,10,7,5,...), ลูกศร ↓ แสดงถูกต้องที่ Header (Screenshot ยืนยัน)
