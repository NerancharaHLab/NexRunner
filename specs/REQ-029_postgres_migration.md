# REQ-029: Migrate data store from Azure Table Storage to PostgreSQL (Docker, local)

**Status:** ✅ Done
**Priority:** P1 (architecture change, blocks nothing else but is high-impact)

## Context

ผู้ใช้ขอเปลี่ยน DB จาก Azure Table Storage ไปเป็น PostgreSQL โดยรันผ่าน Docker ก่อน (local) ยืนยันผ่าน
AskUserQuestion 4 ข้อ:

1. **ขอบเขต**: Postgres แทน Azure Table Storage ทั้งหมด — ทั้ง dev/local และ production ในอนาคต ไม่ใช่แค่
   local-only (มีผลกับ [REQ-027](REQ-027_provision_azure_deploy.md) — DB provisioning step เปลี่ยนจาก
   Cosmos DB/Table Storage เป็น Postgres hosting แทน ยังไม่ตัดสินใจรายละเอียดตอนนี้ ปล่อยเป็น open
   question สำหรับ REQ ในอนาคต)
2. **Evidence รูปภาพ**: คงไว้ที่ Azure Blob Storage เหมือนเดิม (Azurite-emulated ตอน local) —
   `lib/azure/blob.ts` ไม่แตะ
3. **ORM**: Prisma
4. **ข้อมูลเดิม**: ไม่มีข้อมูลจริงสำคัญ เริ่ม schema ใหม่ + reseed ได้เลย ไม่ต้องเขียน migration script

## Key design decision: translate at the edges, keep the app-facing contract identical

อ่านทุกไฟล์ใน `lib/azure/*.ts` และทั้ง ~28 ไฟล์ที่ import จากมัน — โค้ดเดิมมี convention "same function
names/shapes, callers untouched" อยู่แล้ว (ดู comment ใน `lib/scenarios.ts`) จึงเลือกทำต่อ pattern นี้
แทนที่จะ re-normalize ทั้งแอป เพื่อคุม blast radius ของงานใหญ่นี้:

- Interface ฝั่งแอป (`ScenarioDef`, `HospitalSiteEntry`, `SuiteDef`, `TagDef`, `EvidenceItem`,
  `RunEntity`, `ScenarioResultEntity`, `UserEntity` ฯลฯ ใน `lib/types.ts`) **คงเดิมทุกฟิลด์** รวมถึง
  ฟิลด์แบบ Table-Storage (`partitionKey`/`rowKey`/`rolesJson`/`tagsJson`/`scenarioIdsJson`/
  `evidenceJson`) — `lib/runs.ts`, `lib/scenarios.ts`, `lib/auth/guard.ts`, และทุกหน้า `app/**/*.tsx`
  **ไม่ต้องแก้ logic เลย** แก้แค่ import path จาก `@/lib/azure/X` เป็น `@/lib/db/X`
- `lib/db/*.ts` (ใหม่) reimplement ทุกฟังก์ชันที่ export จาก `lib/azure/*-table.ts` เดิม แต่ใช้ Prisma
  คุยกับ Postgres schema ที่ normalize จริง (native `text[]`, real FK, `Role` enum) แล้วแปลงกลับเป็น
  shape เดิม (เช่น stringify array กลับเป็น `xxxJson`) ที่ boundary ของแต่ละฟังก์ชัน
- ผลคือ diff เป็นแบบ mechanical เสี่ยงต่ำ: `prisma/schema.prisma` ใหม่ + `lib/db/*.ts` ใหม่ + สลับ
  import ~28 จุด แทนที่จะ rewrite ทั้งแอป

## Prisma schema

ดู schema เต็มในไฟล์ `web/prisma/schema.prisma` (7 models: User, Site, Scenario, Suite, Tag, Run,
ScenarioResult + enum Role) — สรุป decision ที่ไม่ตรงไปตรงมา:

- `Scenario.siteKey` **ไม่มี FK** ไป Site เพราะ partition `__MASTER__` (Master Scenario Library)
  ไม่ใช่ Site จริง — เหมือน behavior เดิม
- `Run.siteKey` **มี FK** ไป Site — Postgres บังคับกฎที่ `deleteSite()` เช็คเองอยู่แล้ว (ห้ามลบ Site ที่มี
  Run) ได้ฟรี ไม่กระทบ caller ที่ทำถูกอยู่แล้ว
- `Run.gateResult` เป็น `String` ธรรมดา ไม่ใช่ enum เพราะค่า `"NOT READY"` มีช่องว่าง
- `Run.executedDate` คง `String` (ไม่ใช่ `DateTime`) เพราะทุกจุดที่อ่านค่านี้ปัจจุบันปฏิบัติกับมันเป็น
  string `"YYYY-MM-DD"` ตรงๆ ไม่มีที่ไหน parse เป็น Date object
- `ScenarioResult.evidence` เป็น `Json` (ไม่ใช่ normalized table) เพราะเป็น nested list เล็กๆ
  `[{id, blobName, uploadedAt}]` ไม่มีที่ไหนต้อง query/filter ข้างในเลย

## Implementation

- `web/docker-compose.yml` — service `db` เดียว, `postgres:16-alpine`, named volume, healthcheck
- `web/prisma/schema.prisma`, `web/prisma/seed.ts`
- `web/lib/db/client.ts` — PrismaClient singleton (globalThis caching, hot-reload-safe)
- `web/lib/db/{users,sites,scenarios,tags,test-suites}-table.ts`, `web/lib/db/tables.ts` (Runs +
  ScenarioResults) — same exported function signatures as `lib/azure/*` counterparts
- ~28 call-site files — swap `@/lib/azure/X` → `@/lib/db/X` only, no logic change
- `temp_scripts/seed_admin_user.ts`, `temp_scripts/seed_scenarios_and_sites.ts` — same swap,
  best-effort/low priority (one-off scripts, not part of running app)
- `.env.local` / `.env.local.example` — add `DATABASE_URL`; update `AZURE_STORAGE_CONNECTION_STRING`
  comment to say Blob-only now; remove obsolete Cosmos DB Free Tier production note
- `web/package.json` — add `prisma`/`@prisma/client`; scripts `db:up`, `db:migrate`, `db:seed`,
  `predev:all` hook
- `web/README.md` — replace Table Storage/Cosmos DB sections with Postgres/Docker instructions
- `TODO.md` — REQ-029 line + a short note on REQ-024/REQ-027 that their DB assumption changed

Cutover: build the full `lib/db/*.ts` layer + docker-compose + prisma migrate first, then swap every
import site, verify (build + full E2E + manual Puppeteer pass across CRUD/Run/Scenario Board/
evidence), and only after everything is green, delete the now-dead `lib/azure/client.ts` +
`lib/azure/*-table.ts` files (`lib/azure/blob.ts` stays, untouched, for the whole task).

## Deviations from the approved plan (discovered during implementation)

- **Prisma version**: npm's `latest` dist-tag currently resolves to `8.0.0-rc.12`, a pre-release
  with a completely different "Developer Platform" CLI (cloud auth/project commands, no classic
  `migrate`/`generate`). Pinned to `7.10.0` (the last stable tag, `prev`) instead — same ORM, same
  schema language, just the actual stable release.
- **Prisma 7 driver adapters**: `datasource.url` in `schema.prisma` is no longer supported in
  Prisma 7 — connection config moved to `prisma.config.ts` (CLI side) and `PrismaClient` now
  requires an explicit driver `adapter` (added `@prisma/adapter-pg` + `pg`). Not a design change,
  just how Prisma 7 wires a connection string in now.
- **`ScenarioResult` schema — dropped the FK to `Run`**: the plan's original schema had
  `ScenarioResult` keyed by `(siteKey, runId, scenarioRowKey)` with a real FK to `Run`. Implementing
  it, I realized `lib/db/tables.ts` only ever receives the *combined* `makeRunPartitionKey(siteKey,
  runId)` string from `lib/runs.ts` (kept untouched, per the "translate at the edges" decision) —
  and both Site id and the New Run form's Run ID field are free text with no format restriction, so
  splitting that combined string back into siteKey/runId is ambiguous whenever either one contains
  an underscore. Fixed by storing `runPartitionKey` verbatim (no split, no FK) — exactly how Table
  Storage's own PartitionKey worked (it had no referential integrity here either), so this isn't a
  regression, just not the extra integrity win I'd hoped for on this one table. `Run.siteKey`'s FK
  to `Site` is unaffected (siteKey there is a real column, never derived by splitting).
- **`lib/db/client.ts` needed its own `.env.local` loading**: initial version read `DATABASE_URL` at
  module-load time, which — thanks to ESM import hoisting — could run *before* a standalone script's
  own `process.loadEnvFile()` line (e.g. `e2e/global-setup.ts`), even though that line is textually
  first in the file. Fixed by having `lib/db/client.ts` load `.env.local` defensively itself
  (try/catch, since production has no such file).
- **`prisma migrate reset` safety gate**: Prisma's CLI refuses this destructive command for an AI
  agent without explicit human consent (needed it once, to regenerate the migration after the
  ScenarioResult fix above). Asked via AskUserQuestion, got explicit confirmation, passed it through
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` as the tool requires. Only ever run against the
  brand-new local Docker DB (no real data existed, confirmed at the start of this task).
- **Postgres port 5435, not 5432**: this machine already has 3 other local projects' Postgres
  containers on 5432/5433/5434.

## Verification Log

- [x] `npm run build` ผ่านสะอาด
- [x] `npm run test:e2e` 24/24 รันกับ Docker Postgres (แทน Azurite-for-tables; Azurite ยังรันอยู่สำหรับ Blob) —
  รันซ้ำหลายรอบ รวมถึงหลัง `docker compose down -v` (DB ว่างเปล่าจริง) และหลังลบไฟล์ `lib/azure/*` ที่ตายแล้ว
  (พบ 1 ครั้งที่ test ล้มเหลวตอนรันแบบ isolated single-test บน dev server ที่เพิ่งสตาร์ทสด — สืบแล้วเป็น
  Turbopack cold-compile timing บน route ที่ยังไม่เคยถูกเรียก ไม่เกี่ยวกับ Postgres, ยืนยันด้วยการรัน full
  suite สดใหม่อีกครั้งแล้วผ่าน 24/24)
- [x] Manual Puppeteer: Tags/Sites/Master-Scenarios(+tag)/Suites CRUD ผ่านหมด — ยืนยันด้วย query
  Postgres ตรง ๆ ว่า `Scenario.tags` และ `Suite.scenarioIds` (native text[]) round-trip ถูกต้อง, และ
  Suite delete ลบจริง (0 rows หลังลบ); Clone-from-Master ไปยัง Site ใหม่ก็ copy tags ถูกต้อง
- [x] `docker compose down -v && docker compose up -d db && npm run db:migrate` สร้าง DB สะอาดใหม่ได้
  จริง (พิสูจน์ว่า Docker setup ไม่พึ่ง local state ที่หลงเหลือ) — ยืนยันแล้ว
