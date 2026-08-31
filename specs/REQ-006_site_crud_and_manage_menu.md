# REQ-006: Site CRUD (Active/Inactive) + Manage menu grouping + bigger Start Run button

**Status:** ✅ Done
**Priority:** P1

## Context

ผู้ใช้ขอ 3 เรื่องรวดเดียว ยืนยัน 4 จุดผ่าน AskUserQuestion (เลือก Recommended ทุกข้อ): (1) สิทธิ์จัดการ Site =
`CAN_EDIT_CONTENT` (admin+qa_lead) เหมือน Scenario/Suite/Tag (2) บล็อก Delete ถ้ายังมี Run อยู่ ต้อง
Deactivate แทน — Scenario อย่างเดียวไม่บล็อก (3) Inactive Site ซ่อนจาก List (Home/Admin Site-picker) แต่เข้า
URL ตรงดูข้อมูลเก่าได้ ยกเว้นห้ามสร้าง Run ใหม่แม้เข้า URL ตรง (4) ปุ่ม Start Run แค่ทำใหญ่/เด่นขึ้น ไม่เพิ่มจุด
เริ่มใหม่ที่อื่น.

> Note: an earlier backlog entry titled "Site CRUD UI เต็มรูปแบบ" (written when Sites was still a
> read-only table) was left unchecked and only discovered/corrected as stale much later in the
> session — this REQ is the actual completed implementation it referred to.

## Implementation & Verification Log

- [x] `lib/types.ts` — เพิ่ม `SiteEntity.active?`, `isActiveSite()`, `HospitalSiteEntry.active: boolean`
- [x] `lib/azure/sites-table.ts` (เดิม Read-only ทั้งไฟล์ — จบสถานะ Deferred ตรงนี้) —
  `listSites({includeInactive?})` Default Active-only (Caller เดิมทุกจุดกลายเป็น "ซ่อน Inactive" อัตโนมัติไม่
  ต้องแก้โค้ดหน้าอื่น), `createSite`/`updateSiteName`/`updateSiteActive`/`deleteSite` (เช็ค
  `listRunsForSite` ก่อนเสมอ Throw `SiteHasRunsError` ถ้ามี) — Site ID Immutable หลังสร้าง (เพราะเป็น
  Partition Key ของ Scenarios/Runs/ScenarioResults ต่างจาก Scenario/Suite ที่ Rename ID ได้)
- [x] `lib/runs.ts` — `createRun()` เพิ่มเช็ค `site.active` (Defense-in-depth คู่กับ Page-level Block)
- [x] `app/[site]/new/page.tsx` — เช็ค Site Inactive แล้วแสดงข้อความ Block แทนฟอร์ม
- [x] หน้า Admin ใหม่ 3 หน้า `admin/sites/{page,new/page,[id]/edit/page}.tsx` (Toggle Active เหมือน
  `admin/users`, ID Field Read-only ตอน Edit) + ปุ่ม "Manage Sites →" ในหน้า `admin/scenarios/page.tsx`
- [x] `app/ManageMenu.tsx` (ใหม่, Client Component) + แก้ `TopNav.tsx` ให้ใช้ Dropdown แทน Flat Links เดิม
  (Manage Scenarios+Sites ใต้ CAN_EDIT_CONTENT, Manage Users ใต้ Admin-only) + CSS
  `.manage-menu`/`.manage-menu-btn`/`.manage-menu-panel` ใน `globals.css`
- [x] CSS `.btn-lg` ใหม่ ใน `globals.css` ใช้กับปุ่ม "+ Start New Run" ใน `app/[site]/page.tsx`
- [x] อัปเดต `e2e/tests/01-auth.spec.ts` — เพิ่ม Click เปิด `top-nav:btn__manage-menu` ก่อน Assert
  `toBeVisible()` บน `link__admin-scenarios`/`link__admin-users` (2 Test Case) — ยืนยันแล้วว่าไม่มี Spec อื่น
  แตะ Testid พวกนี้เลย
- [x] `npm run build` ผ่านสะอาด — Route ใหม่ `/admin/sites`, `/admin/sites/new`, `/admin/sites/[id]/edit` ขึ้น
  ครบ
- [x] `npm run test:e2e` **24/24 ผ่านครบ** (ด้วย Spec ที่อัปเดตแล้ว)
- [x] Manual/Puppeteer Verify เต็ม (สคริปต์ `shot_sites.js`): สร้าง Site ใหม่ → เห็นใน Home Picker + Admin
  Scenario Picker ✓ → Deactivate → Badge "Inactive" ขึ้นถูกต้อง หายจาก Picker ทั้งคู่ ✓ แต่เข้า Run History ตรง
  (Status 200, H1 ถูกต้อง) และ `/new` ตรงยังเปิดได้ (ไม่ใช่ 404) โดยแสดงข้อความ Block "This site is
  inactive..." ไม่มีฟอร์ม Start Run เลย ✓ → Reactivate → `/new` กลับมามีฟอร์มปกติ ✓ → สร้าง Run จริง 1 อัน →
  ลอง Delete Site ที่มี Run ผูกอยู่ → ถูก Block ด้วยข้อความ "Cannot delete — this site has 1 existing
  Run(s). Deactivate it instead." ตรงตาม Spec ✓ → เปิดเมนู Manage ในฐานะ Admin เห็นครบ 3 ("Manage
  Scenarios", "Manage Sites", "Manage Users") ✓ → Screenshot ยืนยัน UI ด้วยตา: ตาราง Manage Sites มี Toggle
  Switch สีเขียว/เทาถูกต้อง แถว Inactive จางลงตาม Convention เดิม, Dropdown Manage ▾ แสดงผลสวยงามถูก Layout,
  ปุ่ม "+ Start New Run" ใหญ่/เด่นขึ้นเห็นชัดเทียบปุ่มอื่นในหน้าเดียวกัน
