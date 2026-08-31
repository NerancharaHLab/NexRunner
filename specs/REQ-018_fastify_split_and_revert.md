# REQ-018: Fastify split & revert (architecture detour)

**Status:** ✅ Done (superseded/reverted, kept as history)
**Priority:** P0

## Context

> **หมายเหตุ (สถาปัตยกรรมไปกลับ):** เคยแยกเป็น Next.js (Frontend) + Fastify (Backend แยก `server/`) ตามที่
> ขอไว้ครั้งหนึ่ง — สร้างเสร็จ + ตรวจสอบผ่านจริงด้วย curl (`server/` ทำงานถูกต้อง 100%) แต่ผู้ใช้ตัดสินใจ
> **กลับไปใช้ Next.js เดียวจบเหมือนเดิม** จึงย้าย Business Logic กลับเข้า `web/lib/**`, คืน `web/app/api/**`,
> ลบโฟลเดอร์ `server/` ทิ้งทั้งหมด แล้วตรวจสอบซ้ำด้วย curl sequence เดิมอีกรอบ (ผลตรงกันทุกตัวเลข) — บันทึกไว้
> เป็น Log ทั้งสองรอบ ไม่ลบประวัติ

## Implementation & Verification Log

- [x] **(superseded)** แยก Backend/Frontend เป็น Next.js + Fastify — สร้าง `server/` (Fastify +
  TypeScript, `tsx watch` สำหรับ Dev, `tsc` build) ย้าย `types.ts`/`scenarios.ts`/`azure/tables.ts`/
  `runs.ts` เข้าไปเป็น Source of Truth, เขียน Route ครบ (`/health`, `/sites`, `/scenarios/:site`,
  `/runs`, `/runs/:site/:runId`, `PATCH .../scenarios/:scenarioId`), แก้ `web/` ให้เหลือแค่ Frontend
  เรียกผ่าน `lib/api.ts` (fetch wrapper) ด้วย `NEXT_PUBLIC_API_URL` — **ตรวจสอบผ่านจริงด้วย curl ทั้ง 2
  ฝั่ง**: ยิงตรงที่ Fastify `:4000` ได้ผลตรงกับของเดิมทุกตัวเลข (`passed:1, failed:1, notrun:15,
  gateResult:"NOT READY"`) ทั้ง `npm run build` ผ่านสะอาดทั้ง `web/` และ `server/`
- [x] เตรียมโค้ด/เอกสารรองรับ Cosmos DB Free Tier (Table API) ระหว่างช่วงนี้ — เพิ่ม Comment อธิบาย
  Compatibility ใน `web/lib/azure/tables.ts` (ไม่ต้องแก้ Logic เพราะ SDK ตัวเดียวกัน), เพิ่มตัวอย่าง
  Connection String ทั้ง 2 แบบ (Cosmos DB Free Tier / Storage Account ปกติ) ใน `web/.env.local.example`,
  เพิ่มหัวข้อ "Cosmos DB Free Tier" ใน `web/README.md` พร้อมขั้นตอน Provision ให้ SA ทำ + เตือนเงื่อนไข
  "1 Free Tier ต่อ 1 Subscription" ชัดเจน — `npm run build` ผ่านสะอาดหลังแก้ (เป็นแค่ Comment/Doc ไม่กระทบ
  Logic) **ยังไม่ได้ทดสอบกับ Cosmos DB จริง** เพราะไม่มี Account จริงให้ทดสอบ ต้องรอ SA Provision + ยืนยัน
  โควตาว่างก่อน
- [x] **ผู้ใช้ขอกลับไปใช้ Next.js เดียวจบทันทีหลังตรวจสอบเสร็จ** — Revert กลับเป็น Next.js เดียวจบ — คืนไฟล์
  `web/lib/{types,scenarios,runs}.ts`, `web/lib/azure/tables.ts`, `web/app/api/**` (3 Route Handler)
  และ `web/data/scenarios/*.json` ให้ตรงกับเวอร์ชันก่อนแยก Fastify, ลบ `web/lib/api.ts`, คืน Azure/Azurite
  dependency ใน `web/package.json`, ลบโฟลเดอร์ `server/` ทิ้งทั้งหมด — **ตรวจสอบซ้ำด้วย curl sequence เดิม
  ทุกขั้นตอนอีกรอบ**: สร้าง Run ใหม่ (`SM-RUN-REVERT-001`) → PATCH 2 Scenario → GET ได้ผลตรงกัน
  (`passed:1, failed:1, notrun:15, passRatePercent:6, gateResult:"NOT READY"`) และ SSR Render ครบ
  17 Scenario — `npm run build` ผ่านสะอาด ลบข้อมูลทดสอบ + ปิด Azurite/dev server แล้ว

Route/Data Model ที่ออกแบบไว้ตอนแยก Fastify ยังใช้อ้างอิงได้เผื่อกลับมาแยกอีกครั้งในอนาคต.
