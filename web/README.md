# Smoke Test Runner

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
- **Evidence Storage**: Azure Blob Storage (screenshots only — the DB itself is not on Azure)
- **Local Emulator**: Docker Postgres (DB) + Azurite (Blob only)
- **Authentication**: Email + Password (Session JWT with httpOnly Cookie)
- **Testing**: Playwright (End-to-End Test Suite)

---

## การติดตั้งและเริ่มใช้งาน (Local Setup)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.local.example` เป็น `.env.local` (ค่าเริ่มต้นพร้อมชี้ไปยัง Azurite Emulator):
```bash
cp .env.local.example .env.local
```

### 3. สร้าง Database Schema (รันครั้งแรกครั้งเดียว หรือหลัง Schema เปลี่ยน)
ต้องมี [Docker](https://www.docker.com/) รันอยู่ก่อน:
```bash
npm run db:up       # docker compose up -d db — สร้าง Postgres container
npm run db:migrate  # prisma migrate dev — สร้าง Schema
```

### 4. รัน Dev Server พร้อม Azurite Emulator
รันทั้ง Docker Postgres, Azurite และ Next.js ในคำสั่งเดียว (`predev:all` จะเรียก `db:up` ให้อัตโนมัติ):
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
| `AZURE_STORAGE_CONNECTION_STRING` | Connection String สำหรับ Azure Blob Storage (Evidence เท่านั้น) | Default Azurite connection string |
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
│   ├── azure/            # Azure Blob Storage Client (Evidence images only)
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
- **ยังไม่ทำ**:
  - Multi-stage `Dockerfile` สำหรับ Build และ Run Next.js เองในระดับ Production
  - เพิ่ม Azurite (Blob) เข้า `docker-compose.yml` เดียวกัน (ตอนนี้ยังรันแยกผ่าน `npm run azurite`)
  - Backup/Restore ข้อมูลใน Volume สำหรับ Local และ Staging Environment

### 2. Features & System Enhancements
- **Site Management UI**: หน้า UI สำหรับเพิ่ม แก้ไข และลบรายชื่อโรงพยาบาล/ไซต์ (Full CRUD)
- **Dynamic Config**: ระบบจัดการ Environment List และ Data Chain Field Schema ผ่าน Admin Portal
- **Production Cloud Deployment**: ยังไม่ตัดสินใจว่าจะ Host Postgres (สำหรับ DB) ที่ไหน — เป็น Open
  Question ที่ยังไม่ resolve (ดู REQ-027 ใน TODO.md) ส่วน Evidence ยังคง Deploy คู่กับ Azure Blob
  Storage Account เหมือนเดิม
