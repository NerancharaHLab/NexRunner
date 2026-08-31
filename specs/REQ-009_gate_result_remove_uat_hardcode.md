# REQ-009: Refactor Gate Result & Context Summary Display (remove hardcoded "FOR UAT")

**Status:** ✅ Done
**Priority:** P1

## Context

ผู้ใช้ส่ง Task Spec ละเอียดครบพร้อม Acceptance Criteria มาเองระหว่างที่กำลัง Explore Phase 2 (REQ-010) อยู่ —
Spec ชัดเจนไม่มีจุดต้องถามเพิ่ม ไปตาม Spec ตรงๆ แล้วผู้ใช้ส่ง Spec เพิ่มเติมอีกรอบทันทีหลัง Commit ยังไม่ทัน เจอ
อีก 2 จุดที่ยังมีคำ Hardcode "UAT" หลุดอยู่ (นอก Scope เดิมที่ระบุไว้ในรอบแรก) — รวมแก้เข้า Commit เดียวกันเพราะ
เป็นเรื่องเดียวกัน ไม่ใช่ Task ใหม่.

## Implementation & Verification Log

### Round 1

- [x] `ScenarioBoard.tsx` — Gate Badge หลัก (มี `data-testid="run-detail:badge__gate"`) ตัด "FOR UAT" เหลือ
  แค่ "READY"/"NOT READY" (Mini Bar จาก REQ-008 ถูกอยู่แล้วไม่ต้องแก้) + เพิ่ม Context Summary "Version •
  Environment • Test Cycle • Date" ข้าง Badge (กรอง Version ว่างออกอัตโนมัติ)
- [x] `LinearReportModal.tsx` — เปลี่ยน Format บรรทัด Header สรุปผลตาม Spec เป๊ะ: `[READY/NOT READY]:
  [Version] Environment — Cycle (Date) (Pass Rate: X%)`
- [x] `executive-report/page.tsx` — Banner Title ใช้ `run.environment` จริงอยู่แล้ว (ตรวจสอบแล้วไม่ต้องแก้
  ยืนยันซ้ำด้วย Puppeteer) + จัดลำดับตาราง Traceability ใหม่เป็น System Version→Environment, Test Cycle→Run
  ID, Hospital Site→Delivery Batch, HN→VN, AN→Bill (เพิ่ม Environment เข้าตารางเป็นคอลัมน์ใหม่ที่ไม่เคยมีใน
  ตารางนี้มาก่อน)
- [x] CSS `.context-summary` ใหม่ใน `globals.css`
- [x] อัปเดต `e2e/tests/04-scenario-board.spec.ts` — 2 จุดที่ Assert `"READY FOR UAT"` เปลี่ยนเป็น `"READY"`

### Round 2 (found right after)

- [x] `LinearReportModal.tsx` บรรทัด Header ข้อความ `📢 **[Smoke Test Summary Report] - Pre-UAT
  Verification Sign-off**` → เปลี่ยนเป็น `- ${run.environment} Verification Sign-off**`
- [x] `executive-report/page.tsx` — Subtitle `Pre-UAT Smoke Test Sign-off Matrix & Audit Trail` →
  เปลี่ยนเป็น `{run.environment} Smoke Test Sign-off Matrix & Audit Trail` และ Signature Box `APPROVED FOR
  UAT (CLIENT / EXECUTIVE)` → เปลี่ยนเป็น `APPROVED FOR {run.environment} (CLIENT / EXECUTIVE)`

### Verification

- [x] `npm run build` ผ่านสะอาด (AC5)
- [x] `npm run test:e2e` **24/24 ผ่านครบ** (AC6) ทั้ง 2 รอบ — เช็คเพิ่มว่า `06-reports.spec.ts` ที่ผ่านอยู่แล้ว
  ยัง Assert ความหมายจริง (`toContain("NOT READY")`) ไม่ใช่ผ่านมั่ว
- [x] Manual/Puppeteer Verify เต็ม (สคริปต์ `shot_gaterefactor.js`, `shot_uat2.js`): สร้าง Run มี Version
  "v1.2.0" บน STAGING → Gate Badge แสดง "❌ NOT READY" ไม่มีคำ UAT เลย → Context Summary แสดง "v1.2.0 •
  STAGING • Cycle 1 • 2026-08-31" ตรงลำดับเป๊ะ → Pass ครบทุกตัว → Badge เปลี่ยนเป็น "✅ READY" พอดี (ไม่มี
  UAT) → เปิด Linear Report Modal เช็ค Header Line ตรง Format เป๊ะ: `🟢 READY: [v1.2.0] STAGING — Cycle 1
  (2026-08-31) (Pass Rate: 100%)` → เปิด Executive Report เช็ค Banner "APPROVED FOR STAGING SIGN-OFF"
  (ใช้ Environment จริงยืนยันแล้ว) + Header แถวแรกของตาราง Traceability เรียง System Version, Environment,
  Test Cycle, Run ID ตรงตาม Spec ทุกจุด → Grep ยืนยัน 0 ไฟล์เหลือคำ "UAT" ใน `app/` → สร้าง Run อีกอันด้วย
  Environment="UAT" ตรงๆ ยืนยันว่ายังขึ้น "UAT" ถูกต้อง (พิสูจน์ว่า Dynamic จริง ไม่ใช่แค่เปลี่ยน Hardcode เป็น
  คำอื่น)
