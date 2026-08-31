# REQ-017: Scaffold Next.js app + Azure Table Storage client + core vertical slice

**Status:** ✅ Done
**Priority:** P0

## Context

Initial migration from the static HTML/CSS/JS (localStorage) app to Next.js + Azure (Table
Storage / Blob Storage / Static Web Apps).

## Implementation & Verification Log

- [x] Scaffold `web/` Next.js app — สร้างด้วย `create-next-app` (TypeScript, App Router, ESLint, npm) แล้ว
  ลบ `.git` ที่มันสร้างซ้อนออก (repo หลักยังไม่ได้ init git) ติดตั้ง `@azure/data-tables`,
  `@azure/storage-blob`, `azurite` (dev dep) เพิ่ม `npm run azurite` script ตรวจสอบด้วย `npm run build`
  ผ่านสะอาด
- [x] Azure Table Storage client + data model — `web/lib/types.ts` (RunEntity, ScenarioResultEntity,
  gate-result logic ที่ตรงกับของเดิมใน js/app.js) และ `web/lib/azure/tables.ts` (client factory ต่อ
  Azurite ผ่าน connection string, auto-create table, CRUD helper) ออกแบบ Partition/RowKey ตามแผน (`Runs`:
  PK=siteKey RK=runId, `ScenarioResults`: PK=`${siteKey}_${runId}` RK=sanitized scenario id)
- [x] Core vertical slice + คัดลอก Scenario definitions — คัดลอก `scenarios/*.json` เข้า
  `web/data/scenarios/` (bundle ตอน build ไม่ fetch จาก path ข้างนอกเพราะ deploy บน Static Web Apps จะเข้า
  ไม่ถึง) สร้างหน้า: site picker (`/`) → run history (`/[site]`) → new run form ผ่าน Server Action
  (`/[site]/new`) → run detail พร้อม Scenario list แบบ Client Component ที่กดสถานะ/พิมพ์หมายเหตุแล้ว PATCH
  ไป Azure จริง (`/[site]/[runId]`) พร้อม API routes ครบ (`POST/GET /api/runs`, `GET .../[runId]`, `PATCH
  .../scenarios/[scenarioId]`) — **ตรวจสอบแล้วจริงด้วย curl ตลอด flow**: สร้าง Run → PATCH 2 Scenario
  (1 passed, 1 failed) → GET กลับมาเห็นค่าที่ถูกต้อง (`passed:1, failed:1, notrun:15,
  passRatePercent:6, gateResult:"NOT READY"`) และ SSR หน้า `/NUH/SM-RUN-TEST-001` render ครบ 17 Scenario
  + Gate Badge ถูกต้องจริง ไม่ใช่แค่ build ผ่าน — ลบข้อมูลทดสอบ + ปิด Azurite/dev server หลังตรวจสอบเสร็จแล้ว
