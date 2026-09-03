# Test Runner

เว็บแอปพลิเคชันสำหรับจัดการและบันทึกผลการทำ Smoke Test รองรับการติดตามสถานะแบบเรียลไทม์ แนบหลักฐาน (Evidence) สรุปรายงานสำหรับ Linear และออก Executive Report

---

## ฟีเจอร์หลัก (Key Features)

- **Test Execution & Gate Evaluation**: บันทึกผลทดสอบระดับ Scenario (Pass, Fail, Block, Not Run), ใส่หมายเหตุ และประเมิน Gate Criteria อัตโนมัติ
- **Evidence Management**: รองรับการแนบภาพหลักฐานผลการทดสอบ (Upload & Paste) พร้อม Lightbox ดูภาพขยาย
- **Report Generation**:
  - **Linear Report Modal**: สร้างข้อความสรุปผลการทดสอบพร้อมคัดลอกลง Linear
  - **Executive Report**: หน้ารายงานสรุปสำหรับผู้บริหาร พร้อมรองรับ Print to PDF / Paper format
- **Role-Based Access Control & Admin Portal**:
  - กำหนดสิทธิ์ตาม Role: `admin`, `qa_lead`, `qa_engineer`
  - จัดการข้อมูลผู้ใช้และจัดการชุด Scenario แยกตามไซต์ (Hospital/Site)

---

## Tech Stack

- **Frontend & Backend**: Next.js 16 (App Router, Turbopack, Server Actions)
- **Database**: PostgreSQL via Prisma ORM (Users/Sites/Scenarios/Suites/Tags/Runs/ScenarioResults) — runs in Docker locally
- **Evidence Storage**: SeaweedFS (screenshots only, via its S3-compatible gateway — `@aws-sdk/client-s3`)
- **Local Dev**: Docker Compose runs both Postgres (DB) and SeaweedFS (Evidence) as real containers
- **Authentication**: Email + Password (Session JWT with httpOnly Cookie)
- **Testing**: Playwright (End-to-End Test Suite)

---

## การติดตั้งและเริ่มใช้งาน (Local Setup)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.local.example` เป็น `.env.local` (ค่าเริ่มต้นพร้อมชี้ไปยัง SeaweedFS container ในเครื่อง):
```bash
cp .env.local.example .env.local
```

### 3. สร้าง Database Schema (รันครั้งแรกครั้งเดียว หรือหลัง Schema เปลี่ยน)
ต้องมี [Docker](https://www.docker.com/) รันอยู่ก่อน:
```bash
npm run db:up       # docker compose up -d — สร้าง Postgres + SeaweedFS container
npm run db:migrate  # prisma migrate dev — สร้าง Schema
```

### 4. รัน Dev Server
รันทั้ง Docker Postgres, SeaweedFS และ Next.js ในคำสั่งเดียว (`predev:all` จะเรียก `docker compose up -d` ให้อัตโนมัติ):
```bash
npm run dev:all
```
> สามารถเข้าใช้งานได้ที่ `http://localhost:3000`

### 5. Seed ข้อมูลเริ่มต้น (รันครั้งแรกครั้งเดียว)
เปิด Terminal ใหม่แล้วรันคำสั่ง Seed:

```bash
# 1. สร้าง Admin User คนแรก
npm run db:seed -- admin@example.com <password> "Admin User"

# 2. นำเข้าข้อมูล Scenario และ Site เริ่มต้น
npx tsx ../temp_scripts/seed_scenarios_and_sites.ts
```

---

## การทดสอบ (Testing)

โปรเจกต์มีชุดทดสอบ E2E ด้วย Playwright ครอบคลุม Authentication, CRUD และ Test Run Flow:

```bash
# รัน E2E Test ทั้งหมด
npm run test:e2e

# รัน E2E Test พร้อม Interactive UI Mode
npm run test:e2e:ui
```

---

## Environment Variables

| Variable | Description | ตัวอย่าง (Local) |
|---|---|---|
| `DATABASE_URL` | Postgres Connection String (Prisma) | `postgresql://smoke_test_runner:smoke_test_runner_dev@localhost:5435/smoke_test_runner?schema=public` |
| `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` | S3-compatible endpoint สำหรับ SeaweedFS (Evidence เท่านั้น) | ชี้ไปยัง SeaweedFS container ในเครื่อง (`http://localhost:8333`, placeholder credentials) |
| `AUTH_SECRET` | Secret Key สำหรับ Sign JWT Token | สตริงสุ่ม 32-byte (`openssl rand -base64 32`) |

---

## โครงสร้างโปรเจกต์ (Directory Structure)

```text
web/
├── app/                  # Next.js App Router (Pages, Layouts, API Routes)
│   ├── [site]/           # Run History, New Run, Run Detail, Executive Report
│   ├── admin/            # User Management & Scenario CRUD
│   ├── api/              # Runs & Evidence API endpoints
│   └── login/            # Authentication Page
├── lib/
│   ├── auth/             # Session, Password Hashing & Role Guards
│   ├── db/               # Prisma-backed data access (Users/Sites/Scenarios/Suites/Tags/Runs)
│   ├── storage/          # SeaweedFS (S3-compatible) Client (Evidence images only)
│   └── types.ts          # Type Definitions & Schemas
├── prisma/               # schema.prisma, migrations/, seed.ts
├── e2e/                  # Playwright Test Specs & Fixtures
└── data/                 # Seed Data (Scenarios / Sites JSON)
```

---

## แผนการพัฒนาในอนาคต (Roadmap)

### 1. Docker & Data Persistence Plan (Docker Volume)
- **Database (Done)**: `docker-compose.yml` รัน PostgreSQL ใน Named Volume (`pgdata`) แล้ว — ดู
  `specs/REQ-029_postgres_migration.md` ที่ root repo สำหรับรายละเอียดการย้ายจาก Azure Table Storage
- **Evidence Storage (Done)**: ย้ายจาก Azure Blob Storage/Azurite ไป SeaweedFS แล้ว (REQ-041) —
  รันเป็น container จริงใน `docker-compose.yml` เดียวกับ Postgres (Named Volume `seaweeddata`) ไม่ต้อง
  รันแยกผ่าน npm script อีกต่อไป
- **Production `Dockerfile` (Done)**: multi-stage build สำหรับ Next.js เอง (`web/Dockerfile`) — ดู
  `docs/devops_handoff.md` ที่ root repo
- **ยังไม่ทำ**:
  - Backup/Restore ข้อมูลใน Volume สำหรับ Local และ Staging Environment

### 2. Features & System Enhancements
- **Site Management UI (Done)**: Full CRUD (`admin/sites/*`) — เพิ่ม/แก้ไข/Deactivate ไซต์ได้แล้ว
- **Dynamic Config**:
  - **Environment List (Done)**: ย้ายจาก static config เข้า Admin-managed catalog แล้ว
    (`admin/environments/*`) — ดู `specs/REQ-024_environment_data_chain_schema_crud.md`
  - **Data Chain Field Schema**: ยังเป็น static/hardcoded (HN/VN/AN/Bill เป็นคอลัมน์ตายตัวบน `Run`) —
    การทำ Dynamic Schema จริง (ต่าง Site ต่าง field ได้) ยังไม่ scope เพราะเป็นงานสถาปัตยกรรมระดับใหญ่ ไม่ใช่
    แค่ config-to-DB ธรรมดา ดู `specs/REQ-037_site_configurable_data_chain_schema.md` (ยัง Backlog รอ
    BA/SA scoping)
- **Production Cloud Deployment**: ยังไม่ Provision จริง — Dev/Test ยังคงใช้ Docker Postgres + SeaweedFS
  container ต่อไปตามเดิม จนกว่าจะถึงเวลาขึ้น Production จริง ดู `specs/REQ-027_provision_azure_deploy.md`
  และ `docs/devops_handoff.md` (root repo) สำหรับ Checklist/Runbook ที่เตรียมไว้ให้ — DB จะเป็น schema
  ใหม่ใน `dev_cortex` database ที่มีอยู่แล้ว (ตัดสินใจแล้ว), Storage เป็น SeaweedFS จริง (ตัดสินใจแล้วเช่นกัน)
  — ยังต้องรอ DevOps Provision จริง
