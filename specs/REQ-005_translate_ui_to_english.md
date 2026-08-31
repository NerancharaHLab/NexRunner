# REQ-005: Translate UI to English (permanent, no toggle)

**Status:** ✅ Done
**Priority:** P1

## Context

ผู้ใช้ขอ "เปลี่ยนเว็บเป็นภาษาอังกฤษ แต่ข้อมูล Scenario ยังใช้ภาษาไทยเหมือนเดิม" ยืนยัน 2 จุดผ่าน AskUserQuestion:
(1) แปลเป็นอังกฤษถาวร ไม่สร้าง Language Toggle/i18n Infra (2) ขอบเขต "ข้อมูลที่ยังเป็นไทย" ครอบทุกอย่างที่ผู้ใช้
พิมพ์เข้าเอง ไม่ใช่แค่ Scenario (Suite/Tag/ชื่อโรงพยาบาล/ชื่อคน/ข้อมูล Run เช่น HN/VN/Delivery Batch/Notes) —
Discovery ด้วย `grep -rlP '[\x{0E00}-\x{0E7F}]'` เจอ 31 ไฟล์ ตรวจสอบทีละไฟล์แล้วยืนยันว่าเป็น UI Chrome ล้วน
ไม่มี Data จริงฝังเป็น String Literal เลยสักไฟล์.

## Implementation & Verification Log

- [x] แปล Top-level Pages: `app/page.tsx`, `login/page.tsx`, `change-password/page.tsx`, `TopNav.tsx`,
  `[site]/page.tsx`, `[site]/new/page.tsx`
- [x] แปล Run Detail Area:
  `[site]/[runId]/{page,ScenarioBoard,LinearReportModal,edit/page,executive-report/page,executive-report/PrintButton}.tsx`
- [x] แปล Admin — Scenarios/Master Library/Clone:
  `admin/scenarios/{page,[site]/page,[site]/new/page,[site]/[id]/edit/page,[site]/clone-from-master/page}.tsx`,
  `admin/master-scenarios/{page,new/page,[id]/edit/page}.tsx`
- [x] แปล Admin — Suites/Tags/Users: `admin/suites/{page,new/page,[id]/edit/page}.tsx`,
  `admin/tags/{page,new/page}.tsx`, `admin/users/page.tsx`
- [x] แปล Lib (ข้อความที่ App สร้างเอง ไม่ใช่ Data): `lib/config.ts` (Data Chain Field Label/Placeholder),
  `lib/runs.ts` (`CreateRunError` Message), `lib/azure/tags-table.ts` (`TagAlreadyExistsError`/`Error`
  Message)
- [x] Re-run Discovery Grep ยืนยัน 0 ไฟล์เหลือ Thai ใต้ `app/` และ `lib/` — รอบแรกเจอ 6 ไฟล์ตกหล่น
  (Placeholder/Error Message/Breadcrumb ในฟอร์ม New/Edit ที่ผู้เขียนพลาดระหว่างแปลรอบแรก) แก้ครบแล้ว Re-run
  ซ้ำได้ 0 ไฟล์จริง
- [x] อัปเดต E2E Assertion ที่เช็ค Thai Copy 2 จุด: `e2e/tests/02-site-and-run-history.spec.ts`
  (`"รอบทดสอบ"` → `"Test Runs"`), `e2e/tests/08-admin-user-crud.spec.ts` (`"จัดการ Scenario"` →
  `"Manage Scenarios"`) + Grep ซ้ำทั้ง `e2e/tests/*.spec.ts` ยืนยัน 0 ไฟล์เหลือ Thai
- [x] `npm run build` ผ่านสะอาด
- [x] `npm run test:e2e` **24/24 ผ่านครบ** (ด้วย Assertion ที่อัปเดตแล้ว)
- [x] Manual/Puppeteer Verify: Screenshot หน้าหลักที่เปลี่ยน (Login, Home, New Run รวม Suite/Tag Filter, Admin
  Scenario Site-picker, Admin Users) ยืนยันด้วยตา: UI Chrome ทั้งหมดเป็นอังกฤษ (Heading/Label/ปุ่ม/Breadcrumb/
  Empty-state/Section-label) ขณะที่ข้อมูลจริงที่ผู้ใช้พิมพ์เข้าเอง — ชื่อโรงพยาบาลภาษาไทย (NUH/SBH/TMH),
  Suite/Tag ที่สร้างไว้จาก Session ก่อน, ชื่อผู้ใช้จริง (เช่น "Neranchara K", Email จริง) — ยังคงแสดงตามที่กรอกไว้
  เดิมไม่ถูกแตะเลยสักจุด พิสูจน์ขอบเขต UI/Data ตามที่ออกแบบไว้ถูกต้อง
