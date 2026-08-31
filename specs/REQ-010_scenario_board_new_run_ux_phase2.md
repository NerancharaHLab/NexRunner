# REQ-010: Scenario Board / New Run UX Phase 2 (🥈 UX Enhancement)

**Status:** ✅ Done
**Priority:** P1

## Context

Phase 2 ของ Backlog UX ที่ผู้ใช้จัดลำดับเอง (🥇 = REQ-008, 🥈 = นี่) — แบ่งเป็น 2a (ScenarioBoard: Bulk Pass
All Remaining + Keyboard Shortcuts) กับ 2b (New Run: 2-Column + Linear-style Filter Picker) เพื่อให้ Commit
แยกตาม House Rule "1 Commit = 1 Task".

## 2a — ScenarioBoard.tsx

- [x] ปุ่ม "Pass All Remaining" + Confirm Modal (Reuse `.modal-overlay`/`.modal-card`) — ยิง PATCH ทีละตัว
  แบบ Sequential (Await ทีละ Call ห้าม Parallel) กัน Race Condition ใน `updateScenarioResult()`'s Aggregate
  Recompute พร้อม Progress "Passing... X/Y"
- [x] Keyboard Shortcuts: `focusedIndex` State + Reset เมื่อ Filter เปลี่ยน, Guard ไม่ยิงถ้า Focus อยู่ใน
  Input/Textarea, ลูกศรขึ้น-ลง เลื่อน Focus+Scroll, เลข 1/2/3 = Pass/Fail/Block ที่ Card Focus อยู่, คลิก
  Card ก็ Sync Focus ด้วย
- [x] CSS `.scenario-item.focused` ใหม่
- [x] `npm run build` ผ่านสะอาด + `npm run test:e2e` **24/24 ผ่านครบ**
- [x] Manual/Puppeteer Verify เต็ม (สคริปต์ `shot_phase2a.js`): กด ArrowDown ยืนยัน Focus Ring ย้ายไป Card
  ที่ 2 ถูกต้อง → กด "1" ยืนยัน Pass เฉพาะ Card ที่ Focus อยู่ตัวเดียว ตัวอื่นไม่กระทบ → พิมพ์ "123" ใน Notes
  ยืนยันว่า **ไม่** Trigger Status Change (Guard ทำงานถูกต้อง, Saved ✓ ก็ยังขึ้นปกติ) → กด Pass All Remaining
  เห็น Confirm Modal ข้อความถูกต้อง "This will mark 2 remaining Not Run scenarios as Passed" → ยืนยัน →
  ทุก Card เป็น Passed หมด, Gate ขึ้น READY → **Reload หน้ายืนยันซ้ำว่า Persist ที่ Server จริง ไม่ใช่แค่
  Optimistic UI** (พิสูจน์ว่า Sequential PATCH ไม่มี Race Condition จริงตามที่ออกแบบไว้)

## 2b — New Run Page

- [x] `app/[site]/new/FilterPicker.tsx` (ใหม่, Client Component) — Linear-style "+ Filter" → เลือกประเภท →
  Searchable Checklist → Pill ลบได้ — Render Hidden Input `name` เดิมทุกตัว (`suite_*`/`tag_include_*`/
  `tag_exclude_*`/`tagIncludeMode`) ไม่ต้องแก้ `startRun`/`createRun()` เลย
- [x] `app/[site]/new/page.tsx` — จัด Layout เป็น 2 คอลัมน์ (`.new-run-columns` Grid + Media Query Fallback
  มือถือ) แทนที่ Checkbox List เดิมด้วย `<FilterPicker>`
- [x] **เจอ Bug จริงระหว่าง Verify แก้ให้แล้ว**: ปุ่ม "+ Filter" เดิม Toggle Panel เปิด/ปิด — ถ้าเลือก Suite
  แล้ว Panel ยังเปิดค้างอยู่ (เพื่อให้เลือกต่อได้) พอกด "+ Filter" ซ้ำเพื่อเปิด Category ถัดไป กลับกลายเป็น
  Toggle ปิด Panel แทน (เพราะ State `showMenu` เป็น true อยู่แล้ว) ทำให้เลือก Filter ประเภทที่ 2 ต่อไม่ได้เลยถ้า
  ไม่ปิด-เปิดใหม่ก่อน — แก้เป็นกด "+ Filter" แล้ว Force เปิด + กลับไป Category List เสมอ (ไม่ Toggle ปิด, ใช้
  Click-outside ปิดแทนอย่างเดียว) ตรงกับพฤติกรรม Linear จริง
- [x] `npm run build` ผ่านสะอาด + `npm run test:e2e` **24/24 ผ่านครบ** (ยืนยันแล้วไม่มี Spec แตะ Testid
  Checkbox เดิมที่หายไป, รันซ้ำ 2 รอบหลังแก้ Bug ด้วย)
- [x] Manual/Puppeteer Verify เต็ม (สคริปต์ `shot_phase2b.js`, เหมือน Multi-suite/Tag Verify ก่อนหน้าแต่ผ่าน
  UI ใหม่): 2-Column Layout Render จริง (Grid 2 คอลัมน์ยืนยันด้วย Computed Style) → เปิด +Filter เลือก Suite
  ผ่าน Search ได้ Pill ถูกต้อง → เปิด +Filter อีกรอบเลือก Tag Must-have ได้ Pill พร้อม Default Mode "(OR)"
  ถูกต้อง → Submit สร้าง Run จริง → Subtitle หน้า Run Detail โชว์ทั้งชื่อ Suite และ Tag ตรงกับที่เลือกใน Picker
  → **Scenario Card ที่เห็นจริงมีแค่ตัวที่ติด Tag เท่านั้น (Suite ∩ Tag ทำงานถูกต้อง แม้ Suite จะมี 2 Scenario
  แต่มีแค่ 1 ตัวติด Tag)** พิสูจน์ว่า Hidden Input Trick ส่งผ่าน `createRun()` เดิมได้ถูกต้อง 100% ไม่ต้องแก้
  Logic ฝั่ง Server เลยตามที่ออกแบบไว้
