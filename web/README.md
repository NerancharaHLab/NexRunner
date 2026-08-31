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
- **Database & Storage**: Azure Table Storage (Metadata/Runs/Scenarios) & Azure Blob Storage (Evidence Images)
- **Local Emulator**: Azurite (Table & Blob Emulator)
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

### 3. รัน Dev Server พร้อม Azurite Emulator
รันทั้ง Azurite และ Next.js ในคำสั่งเดียว:
```bash
npm run dev:all
```
> สามารถเข้าใช้งานได้ที่ `http://localhost:3000`

### 4. Seed ข้อมูลเริ่มต้น (รันครั้งแรกครั้งเดียว)
เปิด Terminal ใหม่แล้วรันคำสั่ง Seed:

```bash
# 1. สร้าง Admin User คนแรก
npx tsx --env-file=.env.local ../temp_scripts/seed_admin_user.ts admin@example.com <password> "Admin User"

# 2. นำเข้าข้อมูล Scenario และ Site เริ่มต้น
npx tsx --env-file=.env.local ../temp_scripts/seed_scenarios_and_sites.ts
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
| `AZURE_STORAGE_CONNECTION_STRING` | Connection String สำหรับ Azure Table & Blob Storage | Default Azurite connection string |
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
│   ├── azure/            # Azure Tables & Blob Storage Clients
│   └── types.ts          # Type Definitions & Schemas
├── e2e/                  # Playwright Test Specs & Fixtures
└── data/                 # Seed Data (Scenarios / Sites JSON)
```

---

## แผนการพัฒนาในอนาคต (Roadmap)

### 1. Docker & Data Persistence Plan (Docker Volume)
- **Containerization**:
  - จัดทำ Multi-stage `Dockerfile` สำหรับ Build และ Run Next.js ในระดับ Production
  - จัดทำ `docker-compose.yml` รวม Service ของ Next.js App และ Azurite Storage เข้าด้วยกัน
- **Docker Volume Data Persistence**:
  - กำหนด Named Volume (เช่น `azurite_data`) สำหรับ Mount ข้อมูล Storage ของ Azurite (`.azurite/`) เพื่อป้องกันข้อมูลการทดสอบและรูปภาพ Evidence หายเมื่อ Container ถูก Restart หรือ Recreate
  - รองรับการ Backup/Restore ข้อมูลใน Volume สำหรับ Local และ Staging Environment

### 2. Features & System Enhancements
- **Site Management UI**: หน้า UI สำหรับเพิ่ม แก้ไข และลบรายชื่อโรงพยาบาล/ไซต์ (Full CRUD)
- **Dynamic Config**: ระบบจัดการ Environment List และ Data Chain Field Schema ผ่าน Admin Portal
- **Production Cloud Deployment**: รองรับการ Deploy บน Azure Static Web Apps / Azure Container Apps เชื่อมต่อ Azure Storage Account หรือ Azure Cosmos DB (Table API)
