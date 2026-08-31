# REQ-021: UX/UI Redesign — Jira palette + Linear polish

**Status:** ✅ Done
**Priority:** P1

## Context

คงทิศทาง Jira Palette + Linear Polish ที่ยืนยันไว้ก่อนหน้า — สีเดิมของ Jira ทุกตัว ไม่เปลี่ยน Hue แค่เพิ่มมนๆ/
เงาลอย/spacing rhythm.

## Implementation & Verification Log

- เขียน `web/app/globals.css` ใหม่ทั้งไฟล์ — เพิ่มระบบ Component Class กลาง: `.page-header`/`.breadcrumb`/
  `.eyebrow`/`.section-label` (โครง Header ของทุกหน้า), `.stat-pill`/`.stat-row` (Badge ตัวเลขเล็กในรายการ
  Run), `.stat-card`/`.stat-card-row` (สรุปผลตัวใหญ่บนหน้า Run Detail), `.empty-state`, `.error-banner`,
  `.form-footer`, `.top-nav`/`.top-nav-brand`/`.top-nav-mark`/`.top-nav-links`/`.avatar`/`.user-chip`
  (Nav แยกเป็น Component จริงแทน Inline Style เดิม), `.site-tile-mark`/`.site-tile-name`/`.site-tile-go`
  (โครงใหม่ของ Site Card), `.btn-danger-text`/`.btn-sm`, ปรับ `h1/h2/h3` ให้มี Scale/Tracking ที่แน่นอนแทนต้อง
  ใส่ Inline `marginBottom` เอง — **สีและ Token เดิม (`--accent-color`, สถานะ Pass/Fail/Block/Notrun) ไม่
  แตะเลย**
- แก้ `TopNav.tsx` ให้ใช้ Class ใหม่ทั้งหมด (Logo Mark "ST", Avatar วงกลมจากอักษรตัวแรกของชื่อ User, Sticky
  Top พร้อมเงา)
- แก้ `app/page.tsx` (Site Picker), `app/[site]/page.tsx` (Run History List — เปลี่ยน Stat บรรทัดท้าย Card
  จาก Text ธรรมดาเป็น `.stat-pill` สีตามสถานะ), `app/[site]/new/page.tsx` (แบ่ง Field เป็น 2 Section ด้วย
  `.section-label`: ข้อมูลรอบทดสอบ / Data Chain Tracker), `app/[site]/[runId]/page.tsx` + `ScenarioBoard.tsx`
  (เปลี่ยนสรุปผลบนสุดจาก Emoji+ตัวเลขเรียงแถวธรรมดาเป็น `.stat-card-row` แบบ Dashboard, จัด `.scenario-item`
  ให้ใช้ Class Sub-element แทน Inline Style), `app/login/page.tsx` (จัดกึ่งกลางแนวตั้งจริงด้วย
  `.container-narrow` + Logo Mark)
- แก้หน้า Admin ทั้งหมดให้ตรงระบบเดียวกัน (`admin/users`, `admin/scenarios`, `admin/scenarios/[site]`,
  `admin/scenarios/[site]/new`, `admin/scenarios/[site]/[id]/edit`) — เพิ่ม `.page-header`/`.breadcrumb`/
  `.error-banner`/`.form-footer`, ปุ่มลบเปลี่ยนเป็น `.btn-danger-text` แทน Inline `style={{color:...}}`
- **คง `data-testid` เดิมทุกจุดไม่เปลี่ยนแม้แต่ตัวเดียว** (ตรวจสอบด้วยตาก่อน Commit) — Emoji สถานะ
  (✅❌🟡⚪🟢🔴) ที่เหลืออยู่ใน Stat Pill/Status Label **ตั้งใจคงไว้** เพราะเป็น Semantic Icon สื่อความหมาย
  Pass/Fail จริง คนละกรณีกับ Emoji ตกแต่ง (🏥) ที่ผู้ใช้ขอเอาออกไปก่อนหน้า
- `npm run build` ผ่านสะอาด (Type-check ครบ, ไม่มี Route เพี้ยน) — **ตรวจสอบด้วย Puppeteer ควบคุม Chrome
  จริง** (ติดตั้ง `puppeteer-core` ใน Scratchpad ชั่วคราว ไม่ใช่ Dependency ของโปรเจกต์): รัน `dev:all` จริง,
  Seed User+Scenario ใหม่ (`temp_scripts/seed_admin_user.ts`, `seed_scenarios_and_sites.ts`), Login จริง
  → เดินผ่านทุกหน้าหลัก (Login, Site Picker, Run History ว่าง/มีข้อมูล, New Run Form, Run Detail พร้อม
  Scenario Board, Admin Scenarios List, Admin Users) แล้ว Capture Screenshot ตรวจด้วยตาทุกหน้า ยืนยันว่า
  Layout ไม่พัง ปุ่ม Pass/Fail ไม่ตกบรรทัดเหมือนปัญหาเดิม, สี Jira ถูกต้อง, เงา/มุมมนแบบ Linear ใช้ครบทุก Card
