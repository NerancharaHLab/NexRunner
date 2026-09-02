# REQ-023: `data-testid` audit against `datatest-id-standard` skill

**Status:** ✅ Done
**Priority:** P1

## Context

ใส่ `data-testid` ให้ครบทุก element ที่กด/assert ได้ ตาม pattern จาก skill `datatest-id-standard`. ทำไปบาง
ส่วนแล้วระหว่างสร้างหน้า (ครอบคลุมเยอะขึ้นมากหลัง Auth+CRUD pass — site tile, new-run form, status button,
notes input, gate badge, login form, admin users/scenarios form ทุกฟิลด์) แต่ยังไม่ได้ทำ Audit เทียบกับ
Skill ทุกจุดแบบเป็นทางการ.

## Audit method

Grep ทุกไฟล์ใน `app/` หา `<button>`, `<input>`, `<select>`, `<textarea>`, `<Link>`, `<a>` แล้วเขียนสคริปต์
เล็ก ๆ (ไม่ commit) เดินผ่าน source แบบ character-level (ไล่ track brace depth ของ `{...}` expression และ
quote string) เพื่อหาขอบเขต JSX tag ที่แท้จริง (regex บรรทัดต่อบรรทัดธรรมดาพังกับ multi-line attribute/
`onClick={() => {...}}`) แล้วเช็คว่า block นั้นมี `data-testid` หรือไม่ — รอบแรกที่เขียนแบบ line-based ให้
false positive เยอะมาก (ปุ่มที่ใส่ testid ไว้แล้วจริงถูกฟ้องว่าขาด, comment ที่มีคำว่า `<input>`/`<button>` อยู่ใน
ข้อความอธิบายถูกจับผิดเป็น tag จริง) — แก้แล้วรันซ้ำจนได้ผลที่ตรวจสอบ manual ยืนยันถูกต้อง

## Findings

**False positives ที่คัดออก** (ไม่ใช่ element ที่ "กด/assert" ได้จริงตามเจตนา skill):
- `<input type="hidden">` — เป็น form-data carrier ไม่มีใคร click/assert ตรง ๆ (suites/tags/sites/users/
  master-scenarios/scenarios list pages' delete/toggle forms, FilterPicker's hidden suite/tag inputs)
- ข้อความใน comment ที่พูดถึงคำว่า `<input>`/`<button>` (เช่น "not an editable `<input>`, so it can't be
  changed client-side...") — ไม่ใช่ tag จริง

**ช่องโหว่จริงที่พบ 2 กลุ่ม:**

1. **`app/[site]/new/FilterPicker.tsx` — 4 จุด** (ไฟล์นี้ทุก element อื่นมี testid ครบอยู่แล้ว มีแค่ 4 จุดตกหล่น):
   ปุ่ม pill-label (คลิกเปิด panel ซ้ำ), ปุ่ม "← Back" ใน panel, radio "Any (OR)"/"All (AND)" — เพิ่ม
   `data-testid` ตรง ๆ ทันที (ไฟล์เดียว, ตรงตาม pattern เดิมในไฟล์เป๊ะ ไม่มีความกำกวม)

2. **Breadcrumb links ("← Back to...", "← Choose Another Hospital") + inline helper links ("create one
   on the Manage Tags page", "Add one in the Master Library first") — ~29 จุด ทั่วทั้งแอป (20 ไฟล์)**:
   ไม่มี `data-testid` เลยสักจุดเดียว แต่เป็น pattern ที่สม่ำเสมอทุกหน้า (ปุ่ม/ลิงก์ action หลักมี testid ครบ
   ส่วน breadcrumb ไม่มีเลย) — ดูเหมือนเป็นการเลือกไว้ตั้งแต่แรก (ไม่เคยมี e2e spec ไหนต้อง assert/click
   breadcrumb เลย ใช้ `page.goto()` ตรงแทนตลอด) มากกว่าลืม แต่ตาม skill ตรงตัวถือเป็น element ที่ "กดได้"
   จึงต้องมี — **ถามผู้ใช้ว่าจะทำแค่ scope ที่ชัดเจน (FilterPicker) หรือเติมให้ครบตาม skill ทั้งหมด ผู้ใช้เลือก
   "เติมให้ครบทุกจุดตาม skill ตรงตัว"**

## Implementation

- `FilterPicker.tsx`: เพิ่ม `data-testid` 4 จุดตาม pattern เดิมในไฟล์ (`smoke-runner:new-run:filter-pill-label__{cat}`,
  `smoke-runner:new-run:btn__filter-back`, `smoke-runner:new-run:rad__tag-include-mode-{or|and}`)
- Breadcrumb/inline-link (29 จุด, 20 ไฟล์): เติม `data-testid` ตาม component segment ที่แต่ละไฟล์ใช้อยู่แล้ว
  (อ่านจาก testid อื่นในไฟล์เดียวกัน ไม่ประดิษฐ์ชื่อใหม่) — `link__breadcrumb` สำหรับ breadcrumb, `link__create-tag`
  / `link__create-master-scenario` สำหรับ inline helper link ที่ชี้ไปสร้าง Tag/Master Scenario ก่อน
  - หน้าที่ใช้ component เดียวกันซ้ำหลายหน้า (เช่น `admin-scenario-form` ใช้ทั้ง Master new/edit + Site
    Custom new/edit เพราะเป็น form component แบบเดียวกัน parameterize ต่างกัน) ได้ testid ข้อความเดียวกัน
    ซ้ำข้ามไฟล์โดยตั้งใจ — ตรงกับ pattern ที่มีอยู่แล้วของ `btn__save` ในไฟล์เหล่านี้ ไม่ใช่ collision จริงเพราะคนละ
    route ไม่ render พร้อมกัน
  - `app/[site]/new/page.tsx` มี breadcrumb 2 จุด (early-return ตอน site inactive กับฟอร์มจริง) — เช็คแล้วเป็น
    mutually exclusive branch (render พร้อมกันไม่ได้) ใช้ testid ซ้ำได้ปลอดภัย
- `app/TopNav.tsx`: brand mark link ได้ `smoke-runner:top-nav:link__brand`

## Verification Log

- [x] Audit script (ไม่ commit) รันซ้ำจนเหลือ 0 finding จริง — เหลือแค่ false positive ที่ยืนยันแล้วว่าไม่ใช่ gap
  (hidden input + comment text)
- [x] `npm run build` clean
- [x] `npm run test:e2e` 27/27 — ระหว่างรันเจอ evidence-upload test fail ซ้ำ 3 รอบติด (`evidence-thumb` ไม่
  ปรากฏใน 5s) **root-caused ก่อนสรุปว่าไม่เกี่ยวกับงานนี้**: process `azurite` ที่รันมาตั้งแต่ช่วงบ่าย (11+
  ชม., blob storage สะสม 224MB จาก run ก่อนหน้าทั้งวัน) ทำให้ write ช้าลงจนเกิน timeout — kill ทิ้งแล้วให้
  Playwright's webServer สตาร์ท `dev:all` (Azurite+Next) ใหม่สะอาด รันซ้ำผ่าน 27/27 ทันที ไม่ใช่ regression
  จากการแก้ testid
- [x] Manual Puppeteer spot-check: login แล้วเดิน 9 หน้า (top-nav brand, run-history, new-run, master-
  scenarios list+new, suites, tags, sites, change-password) ยืนยัน breadcrumb testid ที่เพิ่มใหม่ปรากฏจริง
  ใน DOM ทุกจุดที่เช็ค + FilterPicker's "+ Filter" button ยังอยู่ครบ
