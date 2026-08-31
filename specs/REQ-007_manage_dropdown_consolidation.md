# REQ-007: Move sub-nav buttons into the Manage dropdown

**Status:** ✅ Done
**Priority:** P1

## Context

หลัง REQ-006 เพิ่ม "Manage Sites" เข้า TopNav Dropdown แล้ว ผู้ใช้สังเกตว่า "Manage Sites" ซ้ำซ้อนอยู่ทั้งใน
Dropdown และเป็นปุ่ม Sub-nav บนหน้า `admin/scenarios/page.tsx` เองด้วย (พร้อมกับ Manage Tags/Suites, Master
Scenario Library อีก 3 ปุ่ม) ถาม AskUserQuestion แล้วยืนยันให้ย้ายทั้ง 4 ปุ่มเข้า Dropdown (ไม่ใช่แค่ตัด Sites ที่
ซ้ำ).

## Implementation & Verification Log

- [x] Grep `e2e/` หา `admin-scenarios:link__` ยืนยันไม่มี Spec แตะ Testid ที่จะลบ (0 ผลลัพธ์)
- [x] `TopNav.tsx` — เพิ่ม Master Scenario Library/Manage Suites/Manage Tags เข้า `manageLinks` ใต้
  `canEdit` เดิม (Permission เดียวกับที่หน้าเหล่านั้น Gate ไว้แล้ว) เรียงลำดับ: Scenarios → Master Library →
  Suites → Tags → Sites → Users
- [x] `admin/scenarios/page.tsx` — ลบแถวปุ่ม 4 ปุ่มออกจาก Page Header เหลือแค่ Title/Subtitle + ตาราง
  Site-picker
- [x] `npm run build` ผ่านสะอาด
- [x] `npm run test:e2e` **24/24 ผ่านครบ**
- [x] Manual/Puppeteer Verify: เปิด Manage ▾ ในฐานะ Admin เห็นครบ 6 รายการเรียงตรงตามที่ออกแบบเป๊ะ
  (`Manage Scenarios, Master Scenario Library, Manage Suites, Manage Tags, Manage Sites, Manage Users`) →
  เข้า `/admin/scenarios` ยืนยันด้วย Selector นับปุ่มเก่าเหลือ 0 จริง + Screenshot ยืนยันด้วยตา Dropdown แสดงผล
  ถูกต้องสวยงาม
