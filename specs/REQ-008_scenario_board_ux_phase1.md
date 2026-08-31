# REQ-008: Scenario Board UX Phase 1 (Quick Wins)

**Status:** ✅ Done
**Priority:** P1

## Context

หลัง Review UX/BA ผู้ใช้ยืนยัน Scope สินค้าเป็น Smoke Test ระดับ Scenario ตั้งใจแล้ว (บันทึกเป็น Memory
`product-scope-smoke-test-only`) แล้วขอ UX ที่ทำให้ 1 รอบ Run เร็วขึ้น เสนอมา 2 รอบรวม 6 จุด แบ่งเป็น 2 Phase
ตามที่ผู้ใช้จัดลำดับเอง (🥇/🥈) ยืนยันผ่าน AskUserQuestion ให้ทำทีละ Phase — **นี่คือ Phase 1 เท่านั้น** (ทุกจุด
อยู่ใน `ScenarioBoard.tsx` ไม่แตะหน้า New Run — Phase 2 อยู่ที่ REQ-010).

Design decisions: Blocked status folds into the "Failed" filter tab (not a 5th tab, matching the
4 tabs the user asked for exactly). Sticky bar is always visible (not conditionally revealed via
scroll — simpler, no IntersectionObserver needed).

## Implementation & Verification Log

- [x] Filter Tabs (All/Not Run/Failed/Passed มี Count) — Blocked รวมอยู่ใน Tab "Failed"
- [x] Sticky Mini Status Bar (Pass Rate + Gate + Progress X/Y) — เกาะติดใต้ TopNav ตลอดเวลา
- [x] ปุ่ม "Next Unfinished →" กระโดดไป Scenario แรกที่ยังเป็น Not Run + สลับ Filter กลับเป็น All อัตโนมัติกัน
  เป้าหมายโดน Filter บัง
- [x] Save Indicator "Saved ✓" หลัง Notes Commit สำเร็จ Fade หายใน ~2 วิ
- [x] CSS ใหม่ `.sticky-mini-bar`/`.filter-tabs`/`.filter-tab`/`.save-indicator` ใน `globals.css`
- [x] `npm run build` ผ่านสะอาด
- [x] `npm run test:e2e` **24/24 ผ่านครบ** (Default Tab "All" ทุก Spec เดิมไม่ต้องแก้)
- [x] Manual/Puppeteer Verify เต็ม (สคริปต์ `shot_uxphase1.js`): สร้าง Run 3 Scenario → Pass 1 + Fail 1 → Tab
  Count อัปเดตถูกต้องทันที (All 3, Not Run 1, Failed 1, Passed 1) → พิมพ์ Notes ที่ตัว Fail แล้ว Blur →
  "Saved ✓" ขึ้นทันทีหลัง PATCH สำเร็จ แล้วหายไปเองใน 2.2 วิ ✓ → คลิกทุก Tab เช็คจำนวน Card ที่เห็นตรงกับ
  Count เป๊ะทุก Tab → สลับไป Tab "Failed" ก่อน แล้วกด "Next Unfinished →" → ยืนยัน Tab สลับกลับเป็น "All"
  อัตโนมัติ + หน้า Scroll ลงจริง (scrollY จาก 0 เป็น 612)
