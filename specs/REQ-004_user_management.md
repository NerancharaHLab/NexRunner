# REQ-004: User Management (multi-role, deactivate, self-service change password)

**Status:** ✅ Done
**Priority:** P1

## Context

ผู้ใช้ขอ 3 เรื่องต่อเนื่องกันในรอบเดียว ยืนยัน 2 จุดสำคัญผ่าน AskUserQuestion: (1) Reset Password = เปลี่ยน
รหัสผ่านเองตอน Login อยู่แล้ว ไม่ใช่ Forgot-password ผ่าน Email (ยังไม่มี Email Infra) (2) Deactivate ต้อง
ตัดสิทธิ์ทันทีแม้ Session เดิม Login ค้างอยู่.

## Implementation & Verification Log

- [x] Schema: `UserEntity.role` → `rolesJson` (Array) + `active: boolean`, `SessionUser.roles: Role[]`, เพิ่ม
  `parseRoles()`/`hasAnyRole()`/`ALL_ROLES` ใน `lib/types.ts` (`parseRoles` Fallback อ่าน Field `role` เดิมได้
  ด้วย รองรับ User ที่ Seed ไว้ก่อนหน้าไม่ต้อง Migrate)
- [x] `getCurrentUser()` (`lib/auth/guard.ts`) เปลี่ยนเป็น Fetch User สดจาก DB ทุก Request — JWT เหลือแค่
  `{email}` ใช้พิสูจน์ตัวตนเท่านั้น Role/Active/DisplayName อ่านสดเสมอ ทำให้ Deactivate/เปลี่ยน Role มีผลทันที
  โดยไม่ต้องแตะ Call Site อื่นเลย (`requireUser`/`requireRole`/`requireApiUser`/`requireApiRole` ยังทำงาน
  เหมือนเดิม)
- [x] `lib/azure/users-table.ts`: `createUser` รับ `roles: Role[]` + `active:true` เสมอ, เพิ่ม
  `updateUserRoles()`/`updateUserActive()`/`updateUserPassword()`
- [x] Login Action เช็ค `active` ก่อนออก Session + ข้อความแยกจาก "รหัสผ่านผิด" ("บัญชีถูกระงับการใช้งาน...")
- [x] หน้าใหม่ `/change-password` (Self-service, ทุก Role เข้าได้ผ่าน `requireUser()` เฉยๆ ไม่ต้อง Role พิเศษ) +
  Link "เปลี่ยนรหัสผ่าน" จาก TopNav
- [x] Admin Users Page: Role Select → Checkbox หลาย Role (ทั้งตอนสร้างและตอนแก้ต่อแถว), แสดง Role เป็น Pill,
  เพิ่มปุ่มเปิด/ปิดใช้งานต่อแถว (ปิดใช้งานตัวเองไม่ได้ เหมือน Delete), แถว Inactive แสดงจางลง (`opacity:0.55`) +
  Badge "ปิดใช้งาน"
- [x] อัปเดต `e2e/global-setup.ts` (Idempotent Reset Role/Active ของ Fixture User ทุกรอบ) + เขียน
  `08-admin-user-crud.spec.ts` ใหม่ครอบคลุม Multi-role Permission Boundary (มอบ Role 2nd แล้วเข้าถึง
  `/admin/scenarios` ได้จริง), Deactivate-ทันที (Browser Context ที่ Login ค้างอยู่โดน Bounce ไป `/login` ทันที
  ไม่ต้อง Logout เอง), Reactivate, Delete
- [x] เพิ่ม `09-change-password.spec.ts` (เปลี่ยนรหัสผ่านสำเร็จแล้ว Login ด้วยรหัสเก่าไม่ได้/รหัสใหม่ได้, กรอกรหัส
  ปัจจุบันผิดถูก Reject)
- [x] เจอ Bug เล็กระหว่างเขียน Test เอง (ไม่ใช่ App Bug) — Assert `.not.toContainText("ปิดใช้งาน")` พังเพราะ
  ข้อความนี้ปรากฏทั้งตอน Active (เป็น Label ปุ่ม "กดเพื่อปิดใช้งาน") และตอน Inactive (เป็น Badge สถานะ) พร้อมกัน
  แก้โดยเพิ่ม `data-testid` เฉพาะให้ Badge Inactive แยกจากปุ่ม Toggle
- [x] `npm run build` ผ่านสะอาด + `npm run test:e2e` **24/24 ผ่านทั้ง 2 รอบติดกัน** + Puppeteer Spot-check หน้า
  Admin Users (Checkbox/Pill/Dimmed-inactive) และหน้า Change Password ด้วยตา
- [x] **UI Follow-up ตามที่ขอเพิ่ม** — เปลี่ยนรายชื่อผู้ใช้จาก Card เรียงต่อกันเป็น `<table>` จริง (คอลัมน์ ผู้ใช้ /
  Roles / สถานะ / Action) เพิ่ม `.data-table`/`.data-table-wrap` ใน `globals.css`, เปลี่ยนปุ่ม เปิด/ปิดใช้งาน
  จากปุ่มข้อความเป็น Toggle Switch จริง (เพิ่ม `.toggle-switch`/`.toggle-thumb` CSS สีเขียว=Active/เทา=Inactive)
  ยังเป็น Server Action เดิม (คลิกเดียว Submit เหมือนก่อน แค่เปลี่ยนหน้าตา) — Data-testid เดิมทุกตัวไม่เปลี่ยน
  ตรวจสอบผ่าน `npm run test:e2e` 24/24 + Screenshot ดูจริง

## Bug found in production, fixed reactively

**เจอ Bug จริงหลัง Deploy ใช้งาน — แก้ด่วนแล้ว**: ผู้ใช้ Login ไม่ได้จริง (Account จริง
`neranchara.kae@hlabconsulting.com`, `neranchara.ksr@gmail.com` ขึ้น "บัญชีถูกระงับการใช้งาน") สาเหตุ:
`UserEntity.active` เป็น Field ใหม่ ผู้ใช้ที่ Seed ไว้ก่อนหน้า Feature นี้ไม่มี Field นี้ใน DB เลย (`undefined`) แต่
Logic เช็คแบบ `!user.active` ตีความ `undefined` เป็น Inactive ไปด้วย (ควรถือว่า Active โดย Default เพราะไม่เคย
มีใคร Deactivate จริง) แก้โดยเพิ่ม `isActiveUser(entity)` ใน `lib/types.ts` (`return entity.active !== false`)
แล้วเปลี่ยนทุกจุดที่เช็ค `.active` ตรงๆ (`lib/auth/guard.ts`, `app/login/page.tsx`, `app/admin/users/page.tsx`,
`e2e/global-setup.ts`) ให้เรียกผ่าน Helper นี้แทน — ยืนยันด้วย Query DB ตรงว่า 2 Account จริงมี `active:
undefined` และ `isActiveUser()` คืน `true` ถูกต้องแล้ว, รัน `npm run test:e2e` ซ้ำผ่านครบ 24/24 ไม่มี
Regression
