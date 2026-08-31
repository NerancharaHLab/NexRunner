# REQ-015: Edit Run metadata (admin/qa_lead only) + lock Tester field

**Status:** ✅ Done
**Priority:** P1

## Context

แก้ไขข้อมูล Run (Environment/Cycle/Date/Version/Delivery Batch/Data Chain) เฉพาะ admin/qa_lead + ล็อก
Tester ให้เป็นชื่อคน Login เท่านั้น ห้ามแก้ ยืนยันขอบเขต Field + สิทธิ์กับผู้ใช้แล้วผ่าน AskUserQuestion.

## Implementation & Verification Log

- [x] ล็อก Tester Field ใน `web/app/[site]/new/page.tsx` — เปลี่ยนจาก `<input>` เป็น `<div
  className="field-static-value">` อ่านอย่างเดียว (คง `data-testid` เดิมไว้) + บังคับฝั่ง Server ใน
  `startRun` Action ให้ใช้ `user.displayName` เสมอไม่สนใจค่าที่ Client ส่งมา (ป้องกันแม้ Spoof Request ตรง ไม่
  ใช่แค่ซ่อน UI)
- [x] `updateRunMetadata()` ใน `web/lib/runs.ts` — Merge เฉพาะ 9 Field ที่แก้ได้ (Environment/Cycle/
  Date/Version/Delivery Batch/HN/VN/AN/Bill) ไม่แตะ Tester/Result Fields/Key เพิ่ม CSS
  `.field-static-value` ใน `globals.css`
- [x] หน้า `web/app/[site]/[runId]/edit/page.tsx` — `requireRole(CAN_EDIT_CONTENT)` ทั้งใน Page และซ้ำใน
  Server Action (Defense in Depth) ฟอร์มหน้าตาเดียวกับ New Run Form
- [x] เพิ่ม Link "แก้ไขข้อมูล Run" ใน `web/app/[site]/[runId]/page.tsx` (แสดงเฉพาะ Role ที่มีสิทธิ์ — เปลี่ยน
  `requireUser()` ให้เก็บ User มาเช็ค Role)
- [x] `npm run build` ผ่านสะอาด — Route `/[site]/[runId]/edit` ขึ้นแล้ว
- [x] ตรวจสอบด้วย Puppeteer จริง — สร้าง User Role `qa_engineer` เพิ่มสำหรับทดสอบ
  (`qa-engineer-test@test.com`) ยืนยันครบ: (1) Admin เห็นปุ่ม "แก้ไขข้อมูล Run" + แก้ Environment→UAT, Test
  Cycle→"Cycle 9 Edited", HN→"HN-EDITED-999" แล้ว Save เห็นค่าใหม่สะท้อนที่ Run Detail จริง (2) Tester
  Field ใน New Run Form เป็น `<div>` (ไม่ใช่ `<input>`) พิมพ์ไม่ได้จริง (3) qa_engineer ไม่เห็นปุ่ม Edit บน
  Run Detail (4) qa_engineer พิมพ์ URL `/edit` ตรงๆ ถูก Redirect กลับ `/` ทันที (ยืนยันว่า Role Gate ทำงานจริง
  ที่ Server ไม่ใช่แค่ซ่อนปุ่มฝั่ง UI)
