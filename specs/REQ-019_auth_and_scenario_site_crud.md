# REQ-019: Auth (Email+Password) + Scenario/Site CRUD

**Status:** ✅ Done
**Priority:** P1

## Context

ตัดสินใจแล้ว: Login แบบ Email+Password (ไม่ใช้ Entra ID), Role `admin`/`qa_lead`/`qa_engineer`, จำกัดสิทธิ์
แก้ Scenario/Site แค่ `admin`/`qa_lead`, Steps/Criteria เก็บเป็น Free Text เหมือนเดิม (ไม่ทำ Structured List
เพราะเสี่ยง Parse ข้อมูลเดิมพัง).

## Implementation & Verification Log

- เพิ่ม `web/lib/azure/client.ts` (ดึง Table Client factory ออกมาจาก `tables.ts` ให้ table module อื่นใช้ร่วม),
  `users-table.ts`, `scenarios-table.ts`, `sites-table.ts` (3 Table ใหม่: `Users`/`Scenarios`/`Sites`)
- `web/lib/auth/{password,session,guard}.ts` — bcryptjs Hash, JWT (jose) ใน httpOnly Cookie, Guard
  Helper (`requireUser`/`requireRole` ฝั่ง Page+Server Action, `requireApiUser`/`requireApiRole` ฝั่ง API)
  — **ตัดสินใจไม่ใช้ Next.js Middleware/Edge Runtime** เพราะไม่แน่ใจว่า Azure Static Web Apps รองรับเต็มที่
  แค่ไหน (ยังไม่ได้ Deploy จริงให้เช็ค) เลยใช้ Per-route Check แทนเพื่อลดความเสี่ยง
- `web/app/login/page.tsx` (Server Action Login), `web/app/TopNav.tsx` (แสดงชื่อ User + Logout, ผูกใน
  `layout.tsx`)
- `web/app/admin/{layout.tsx,users/page.tsx,scenarios/page.tsx,scenarios/[site]/page.tsx,
  scenarios/[site]/new/page.tsx,scenarios/[site]/[id]/edit/page.tsx}` — CRUD เต็มรูปแบบสำหรับ Scenario,
  List+Create+แก้ Role+ลบสำหรับ User
- ป้องกัน `/api/runs/**` เดิมทั้ง 3 Route ด้วย `requireApiUser()` แล้ว (ก่อนหน้านี้เปิดสาธารณะไม่มี Auth เลย)
- `web/lib/scenarios.ts` เปลี่ยนจาก Sync อ่าน JSON Bundle → Async อ่านจาก DB ทุก Call Site อัปเดต `await`
  ครบ (`app/page.tsx`, `app/[site]/page.tsx`, `app/[site]/new/page.tsx`, `lib/runs.ts` x3 จุด)
- `web/lib/config.ts` ใหม่ — ดึง Environment List + Data Chain Field Schema ออกมาเป็น Static Config
  (ส่วนที่ตัดสินใจไม่ย้ายเข้า DB รอบนี้ — ดู REQ-024)
- `temp_scripts/seed_admin_user.ts`, `temp_scripts/seed_scenarios_and_sites.ts` — One-off Seed Script
  (ยืนยันว่า `tsx` resolve `@/` path alias ข้าม Folder ได้ถูกต้องจริง ไม่ใช่แค่ทฤษฎี)
- **ตรวจสอบผ่านจริงด้วย Puppeteer ควบคุม Chrome จริง** (ไม่ใช่แค่ curl เพราะ Next.js Server Action เข้ารหัส
  Field พิเศษที่ curl ปลอมยาก โดยเฉพาะ Action ที่ Capture ตัวแปรจาก Closure เช่น `site`) — ทดสอบ Flow เต็ม:
  Login เป็น Admin → สร้าง Scenario ใหม่ (`SC-TEST-01`) ผ่าน `/admin/scenarios/NUH/new` → เห็นในหน้า Admin
  List ทันที → **สร้าง Run จริงที่ `/NUH/new` แล้วเห็น Scenario ใหม่โผล่ในหน้า Run Detail จริงโดยไม่ต้อง
  Rebuild/Redeploy (จุดประสงค์หลักของงานนี้ พิสูจน์แล้วจริง ไม่ใช่แค่สมมติ)** → แก้ไข Scenario (เปลี่ยนชื่อ)
  เห็นผลจริง → ลบ Scenario สำเร็จ (ยืนยันด้วย curl แยกอีกชั้นเพราะ Puppeteer Assert มี Timing Race แต่ Backend
  ถูกต้อง) — ทดสอบ Role Gating แยก: สร้าง User Role `qa_engineer` ผ่านหน้า `/admin/users` จริง แล้ว Login
  เป็นคนนั้น ยืนยันว่าเข้า `/admin/scenarios` ไม่ได้ (Redirect กลับ `/`) แต่ใช้งาน `/NUH` ปกติได้ — ทดสอบ API
  Protection แยก: `GET /api/runs` ไม่มี Cookie → 401, มี Cookie → 200 — `npm run build` ผ่านสะอาดทุกครั้งที่แก้
- เก็บ `web/data/scenarios/*.json` ไว้ (ไม่ลบ) เปลี่ยนสถานะเป็น "Seed Data เท่านั้น" (มี `README.md` อธิบายใน
  โฟลเดอร์) เพราะ Seed Script ยังต้องใช้ตอน Provision DB จริงบน Production ทีหลัง — ถ้าลบตอนนี้จะ Seed
  Production ไม่ได้อีก
