# REQ-016: Playwright E2E Test Suite

**Status:** ✅ Done
**Priority:** P1

## Context

ผู้ใช้ขอให้ automate test ทั้งโปรเจกต์ ยืนยันขอบเขต "ครอบคลุม Flow หลัก + เช็ค UI ด้วย" ผ่าน AskUserQuestion —
โครงสร้างมาตรฐาน Playwright (Numbered Spec, fixtures/, webServer Auto-start, workers:1) Auth Fixture ใช้
Cookie-based Session จริงของแอปนี้ (Login ผ่าน UI จริง ไม่ใช่ Shortcut).

## Implementation & Verification Log

- [x] ติดตั้ง `@playwright/test` + `playwright install chromium`, สร้าง `web/e2e/playwright.config.ts`
  (webServer ใช้ `npm run dev:all` เดิม, workers:1)
- [x] `web/e2e/global-setup.ts` — Seed User 3 Role (admin/qa_lead/qa_engineer) + Site `E2E` + Scenario
  3 ตัว (1 Critical) แบบ Idempotent (ใช้ `createUser`/`createScenario`/`upsertSite` ที่เป็น Upsert อยู่แล้ว
  รันซ้ำได้ไม่พัง)
- [x] `web/e2e/fixtures/auth.ts` — Fixture Login จริงผ่าน UI ต่อ Role (adminPage/qaLeadPage/qaEngineerPage)
- [x] Spec ไฟล์ (00-smoke ถึง 09-change-password รวม 24 Spec — ขยายเพิ่มจาก 9 ไฟล์เดิมระหว่าง Feature
  หลังๆ เช่น Multi-role/Deactivate/Change Password) ครอบคลุม Login/Role Gating, Site Picker, New Run +
  Tester Lock, Scenario Board (Status/Notes/Evidence/Gate Badge), Run Edit + Role Gating, Linear+Executive
  Report + Print Media, Admin Scenario CRUD, Admin User CRUD, Change Password — เช็คทั้ง Flow และ UI
  Element จริง (data-testid, class, ข้อความ) ไม่ใช่แค่ยิง API
- [x] เพิ่ม `npm run test:e2e` ใน `package.json`
- [x] รัน 2 รอบติดกันยืนยัน Global Setup Idempotent จริง + เปิด HTML Report ตรวจสอบ — ผ่านครบ (24/24 ในปัจจุบัน)
  ทั้ง 2 รอบ, `npm run build` สะอาด, `playwright-report/index.html` สร้างสำเร็จ

## Bugs found while writing tests

- [x] **เจอ Bug จริงระหว่างเขียน Test แก้ให้แล้ว**: หน้า "เริ่มรอบทดสอบใหม่" (`web/app/[site]/new/page.tsx`)
  ตอน Duplicate Run ID จะ `redirect()` กลับมาที่ `${path}?error=...` แต่ตัว Page Component **ไม่เคยรับ/แสดง
  `searchParams.error` เลยตั้งแต่แรก** (ไม่มี `searchParams` ใน Props, ไม่มี `.error-banner` ใน JSX) —
  สร้าง Run ซ้ำจึง Redirect กลับมาเงียบๆ ไม่มี Error ให้เห็น ยืนยันด้วย 2 เครื่องมือคนละตัว (Playwright +
  Puppeteer แยก Script) ก่อนสรุปว่าเป็น Bug จริงไม่ใช่ Test Timing แก้โดยเพิ่ม `searchParams:
  Promise<{ error?: string }>` ใน Props + Render `{error && <div className="error-banner">{error}</div>}`
  ตามแบบหน้า Admin Form อื่นๆ ที่ทำถูกอยู่แล้ว — ตรวจสอบซ้ำผ่าน

- [x] Debug ระหว่างทาง (ไม่ใช่ Bug จริง แค่ Test เขียนผิด): (1) Auth Fixture เดิมให้ 3 Role ใช้ `page`
  Fixture เดียวกัน ทำให้ Login ทับกันเมื่อ Test เดียวขอ 2 Role พร้อมกัน — แก้เป็นแยก `browser.newContext()`
  ต่อ Role (2) Admin Scenario List ใช้ Sanitize Id แบบไม่ Lowercase (`sc.id.replace(/[^a-zA-Z0-9]/g,"")`)
  ต่างจาก `ScenarioBoard.tsx`'s `cleanId()` ที่ Lowercase ด้วย — ทำ Helper แยก 2 ตัว (`cleanId`/
  `stripNonAlnum`) กันสับสน (3) เช็ค Notes ด้วย `toContainText()` บน Card ทั้งใบ — ผิดหลักการเพราะค่าใน
  `<input>` เป็น Attribute ไม่ใช่ Text Node ไม่มีวันโผล่ใน `textContent()` แก้เป็น `toHaveValue()` บน Input
  ตรงๆ (4) `global-setup.ts` เพิ่ม Self-heal ลบ Scenario เกินออกจาก Site `E2E` ทุกครั้งก่อน Seed ใหม่ (กัน
  Scenario ค้างจาก Test รอบก่อนที่ Interrupt กลางคันไปดันยอดนับใน `06-reports` ให้เพี้ยน)
