# คู่มือและทรัพยากรการทำ Performance Testing ด้วย Grafana k6 (Complete Grafana k6 Resource & Guide)

คู่มือและแหล่งทรัพยากรฉบับสมบูรณ์สำหรับการออกแบบ เขียนสคริปต์ และบริหารจัดการ **Performance Test ด้วย Grafana k6** สำหรับระบบโรงพยาบาลและ Enterprise Applications (รองรับสเกล 400 Concurrent VUs ขึ้นไป)

---

## 📌 สารบัญ (Table of Contents)

1. [สถาปัตยกรรมและมโนทัศน์หลักของ Grafana k6 (Core Architecture)](#1-สถาปัตยกรรมและมโนทัศน์หลักของ-grafana-k6)
2. [รูปแบบโครงสร้างโปรเจกต์ k6 (Project Structure & Design Pattern)](#2-รูปแบบโครงสร้างโปรเจกต์-k6)
3. [คู่มือการเขียนสคริปต์ k6 แบบสเต็ปบายสเต็ป (Code Snippets & Patterns)](#3-คู่มือการเขียนสคริปต์-k6-แบบสเต็ปบายสเต็ป)
4. [การตั้งค่า 5-Stage Workload Ramping Profile (08:00 AM Hospital Model)](#4-การตั้งค่า-5-stage-workload-ramping-profile)
5. [การจัดการข้อมูลทดสอบ (Data Parameterization & Fixtures)](#5-การจัดการข้อมูลทดสอบ)
6. [การคำนวณ Thresholds, Metrics & SLAs](#6-การคำนวณ-thresholds-metrics--slas)
7. [คำสั่งการรันและสรุปรายงาน (Execution & Reporting)](#7-คำสั่งการรันและสรุปรายงาน)
8. [Best Practices และการปรับแต่งระดับ OS (System Tuning)](#8-best-practices-และการปรับแต่งระดับ-os)

---

## 1. สถาปัตยกรรมและมโนทัศน์หลักของ Grafana k6

### 1.1 Virtual Users (VUs) vs Iterations
- **Virtual Users (VUs):** คือ Thread/Goroutine ที่จำลองผู้ใช้งานจริง 1 คนทำงานพร้อมๆ กัน (1 VU = 1 Active Terminal/User Session)
- **Iterations:** คือจำนวนรอบการทำงานของฟังก์ชันหลัก `default function()` ในสคริปต์

### 1.2 Executors หลักใน k6 (Executors Comparison)
| Executor Name | วัตถุประสงค์การใช้งาน | เหมาะสำหรับ Test Type |
|---|---|---|
| `ramping-vus` | ปรับเพิ่ม/ลดจำนวน VUs ตามช่วงเวลา | **Load Test**, **Stress Test**, **Shift Profile** |
| `per-vu-iterations` | กำหนดจำนวนรอบคงที่ต่อ VU | **Smoke Test**, **Validation** |
| `constant-vus` | คงระดับจำนวน VUs นานตามเวลาที่กำหนด | **Soak Test / Endurance Test** |
| `ramping-arrival-rate` | ควบคุมจำนวน Requests/sec (RPS) คงที่ ไม่ขึ้นกับ Response Time | **Open Model Throughput Test** |

---

## 2. รูปแบบโครงสร้างโปรเจกต์ k6 (Project Structure & Design Pattern)

แนะนำให้แบ่งโปรเจกต์ตามหลักการ **Separation of Concerns** (อ้างอิงตามสถาปัตยกรรม `cortex-performance-tests`):

```text
src/
├── clients/              # HTTP Operations Only (GraphQL / REST endpoints)
│   ├── patient.client.ts
│   └── encounter.client.ts
├── scenarios/            # Business Journeys (ผูก Client, Check, Pacing, Data)
│   ├── reception.scenario.ts
│   └── opd-clinic.scenario.ts
├── config/               # Workload & Configuration Definitions
│   ├── environment.ts    # อ่าน ENV Variables
│   ├── thresholds.ts     # SLAs & Success Criteria
│   └── workloads/        # Dynamic Scenarios & Traffic Mix
│       ├── traffic-mix.ts
│       ├── build-scenarios.ts
│       └── load.ts
├── data/                 # Fixtures & Test Data Handlers
│   └── patients.ts
├── helpers/              # Utility Functions
│   ├── think-time.ts
│   ├── error-handling.ts
│   └── checks.ts
└── tests/                # Entrypoints for k6 CLI
    ├── smoke.test.ts
    ├── load.test.ts
    └── stress.test.ts
```

---

## 3. คู่มือการเขียนสคริปต์ k6 แบบสเต็ปบายสเต็ป

### 3.1 การสร้าง GraphQL Client (`src/clients/patient.client.ts`)
```typescript
import http from 'k6/http';
import { environment } from '../config/environment.ts';

export function searchPatientByHn(hn: string) {
  const url = `${environment.baseUrl}/cortex-api/graphql`;
  const payload = JSON.stringify({
    query: `
      query GetPatientByHn($hn: String!) {
        patient(hn: $hn) {
          id
          hn
          title
          firstName
          lastName
        }
      }
    `,
    variables: { hn },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${environment.authToken}`,
      'x-site-id': 'default-site',
    },
    tags: { name: 'GraphQL_GetPatientByHn' },
  };

  return http.post(url, payload, params);
}
```

### 3.2 การสร้าง Scenario พร้อม Think Time (`src/scenarios/reception.scenario.ts`)
```typescript
import { check } from 'k6';
import { searchPatientByHn } from '../clients/patient.client.ts';
import { randomThinkTime } from '../helpers/think-time.ts';
import { getRandomPatientHn } from '../data/patients.ts';

export function receptionScenario() {
  const hn = getRandomPatientHn();
  
  // Step 1: ค้นหาผู้ป่วย
  const res = searchPatientByHn(hn);
  
  // Step 2: ตรวจสอบความถูกต้อง (Checks)
  check(res, {
    'status is 200': (r) => r.status === 200,
    'patient data exists': (r) => r.json('data.patient') !== null,
  });

  // Step 3: Think Time จำลองการอ่านหน้าจอของเจ้าหน้าที่ (3-5 วินาที)
  randomThinkTime(3, 5);
}
```

### 3.3 Helper ฟังก์ชันสำหรับ Think Time (`src/helpers/think-time.ts`)
```typescript
import { sleep } from 'k6';

export function randomThinkTime(minSeconds: number, maxSeconds: number): void {
  const thinkTime = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  sleep(thinkTime);
}
```

---

## 4. การตั้งค่า 5-Stage Workload Ramping Profile (08:00 AM Hospital Model)

การกำหนดสเกล VUs แบบไต่ระดับตามกะเวลาปฏิบัติงานโรงพยาบาล (`src/config/workloads/load.ts`):

```typescript
import type { Options } from 'k6/options';

export const options: Options = {
  scenarios: {
    hospital_diurnal_load: {
      executor: 'ramping-vus',
      startVUs: 60,
      stages: [
        // Stage 1: 08:00 - 10:30 น. Opening Peak (Kiosk/เจาะเลือด) -> 400 VUs
        { duration: '10m', target: 400 },
        
        // Stage 2: 10:30 - 13:00 น. Late Morning (แพทย์ออกตรวจ OPD) -> 360 VUs
        { duration: '15m', target: 360 },
        
        // Stage 3: 13:00 - 16:30 น. Afternoon (ห้องจ่ายยา & การเงิน) -> 304 VUs
        { duration: '20m', target: 304 },
        
        // Stage 4: 16:30 - 20:00 น. Evening Clinic -> 130 VUs
        { duration: '10m', target: 130 },
        
        // Stage 5: 20:00 - 08:00 น. Night Shift Baseline -> 60 VUs
        { duration: '5m', target: 60 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],             // Error rate น้อยกว่า 1%
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // p(95) น้อยกว่า 2 วิ
    checks: ['rate>0.99'],                       // Check pass มากกว่า 99%
  },
};
```

---

## 5. การจัดการข้อมูลทดสอบ (Data Parameterization & Fixtures)

การอ่านไฟล์ JSON Fixture สำหรับสุ่มเลือกข้อมูล HN หรือ Visit ID (`src/data/patients.ts`):

```typescript
import SharedArray from 'k6/data';

interface PatientFixture {
  hn: string;
}

// อ่านไฟล์ JSON เข้าสู่ Memory ครั้งเดียวที่ init stage
const patients = new SharedArray<PatientFixture>('patient_data', function () {
  const data = JSON.parse(open('../../test-data/patients.json'));
  return data;
});

export function getRandomPatientHn(): string {
  const randomIndex = Math.floor(Math.random() * patients.length);
  return patients[randomIndex].hn;
}
```

---

## 6. การคำนวณ Thresholds, Metrics & SLAs

### Custom Metrics สำหรับการติดตามเชิงธุรกิจ (`src/metrics/business.ts`)
```typescript
import { Counter, Trend, Rate } from 'k6/metrics';

export const patientSearchTrend = new Trend('patient_search_duration');
export const failedPrescriptionsCounter = new Counter('failed_prescriptions_total');
export const checkInSuccessRate = new Rate('checkin_success_rate');
```

---

## 7. คำสั่งการรันและสรุปรายงาน (Execution & Reporting)

### 7.1 คำสั่งการรันผ่าน Command Line (CLI Commands)

```bash
# 1. รัน Smoke Test (1 VU เพื่อตรวจสอบความถูกต้องของสคริปต์)
k6 run --env BASE_URL=https://his-test.hospital.org --env AUTH_TOKEN=secret src/tests/smoke.test.ts

# 2. รัน Load Test (400 Concurrent VUs แบบ Ramping Profile)
k6 run --env BASE_URL=https://his-test.hospital.org --env TOTAL_VUS=400 src/tests/load.test.ts

# 3. รันส่งออกรายงานเป็น HTML และ JSON Summary
k6 run --out json=reports/result.json src/tests/load.test.ts
```

### 7.2 การเปิดใช้ `handleSummary` เพื่อสร้าง HTML Summary Report
```typescript
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export function handleSummary(data: any) {
  return {
    'reports/summary.html': htmlReport(data),
    'reports/summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

---

## 8. Best Practices และการปรับแต่งระดับ OS (System Tuning)

### 8.1 การปรับแต่ง OS สภาพแวดล้อมที่ใช้ยิง Load (Host OS Tuning)
ก่อนยิง 400 VUs ขึ้นไป ให้ปรับเพิ่ม File Descriptors Limit บน macOS/Linux:

```bash
# ตรวจสอบขีดจำกัดเดิม
ulimit -n

# ปรับเพิ่มขีดจำกัดเป็น 65,536 open files
ulimit -n 65536
```

### 8.2 ข้อควรระวังในการเขียน สคริปต์ k6 (k6 Anti-patterns to Avoid)
1. ❌ **ห้ามใช้ Node.js native modules:** เช่น `fs`, `path`, `child_process` ภายในสคริปต์ k6 (k6 รันบน Go runtime ไม่ใช่ Node.js)
2. ❌ **ห้ามยิง HTTP ใน init stage:** การยิง HTTP ให้ยิงภายใน `default function()` หรือ Scenario function เท่านั้น
3. ❌ **ห้ามละเลย Think Time:** การไม่ใส่ `sleep()` จะทำให้ VUs ยิงวนซ้ำถี่เกินความเป็นจริง (Unrealistic Spike)
4. 🟢 **ควรใส่ Tags ประจำทุก HTTP Request:** เพื่อให้แยกสถิติ p95/p99 ตาม API endpoints ได้ชัดเจนใน Grafana Dashboard


---

# 🔄 กระบวนการทดสอบและปรับแต่งประสิทธิภาพระบบ (4-Step Performance Engineering Lifecycle)

กระบวนการวงรอบการทดสอบ ปรับแต่งระบบ และเก็บผลลัพธ์ประสิทธิภาพสำหรับทดสอบประเภทต่าง ๆ (**Test $
ightarrow$ Tuning $
ightarrow$ Retest $
ightarrow$ เก็บผลและสรุปรายงาน**)

```
[1. Test] ------------> ยิงทดสอบค่าน้ำหนัก VUs และคอยสังเกตอาการระบบ
   ↓
[2. Tuning] ----------> วิเคราะห์คอขวด & ปรับแต่ง (DB Pool, Index, Pod, Cache, App Worker)
   ↓
[3. Retest] ----------> ยิงทดสอบซ้ำด้วยสคริปต์เดิมเพื่อเปรียบเทียบผล (Before vs After)
   ↓
[4. เก็บผล & รายงาน] --> บันทึกสถิติ p95, p99, Throughput (RPS), Error Rate & System Metrics
```

---

## 📊 เปรียบเทียบ 5 ประเภทการทดสอบประสิทธิภาพ (Performance Test Types Matrix)

| ประเภทการทดสอบ (Test Type) | เป้าหมาย VUs (Concurrency) | ระยะเวลาการยิง (Duration) | วัตถุประสงค์หลัก (Core Objective) | คอขวดที่พบบ่อย (Common Bottleneck) |
|---|---|---|---|---|
| **1. Load Test** | **400 VUs** (สเกลเปิดกะ 08:00 น.) | 30 - 60 นาที | ทดสอบการรองรับภาระงานปกติของโรงพยาบาลช่วงพีค | DB Connection Pool เต็ม, Index Scan |
| **2. Spike Test** | **800 - 1,000 VUs** (ยิงพุ่งใน 30 วิ) | 5 - 10 นาที | ทดสอบคิวนัดหมายเปิด 8 โมงเช้ากะทันหัน และดูการ Recovery | CPU Throttling, Nginx Worker Exhaustion |
| **3. Stress Test** | **600 - 800 VUs** (อัดเกินขีดปกติ) | 30 - 45 นาที | หาขีดความสามารถสูงสุด และพฤติกรรมเมื่อระบบเริ่มพัง | Memory Leak, DB Lock Timeout, OOM Kills |
| **4. Endurance Test** | **250 - 300 VUs** (ยิงคงที่ระยะยาว) | 2 - 12 ชั่วโมง | ตรวจหา Memory Leak, DB Connection Leak, Disk Full | Memory Leak, Unclosed DB Sessions |
| **5. Breakpoint Test** | **ไต่ระดับเรื่อยๆ จนกว่าระบบจะพัง** | 1 - 2 ชั่วโมง | หาจุดแตกหัก (Breaking Point Threshold) | Maximum Hardware Capacity Threshold |

---

## 🛠️ รายละเอียดวงรอบการทดสอบรายประเภท (Detailed 4-Step Lifecycle per Test Type)

### 1. 🎯 Load Test Lifecycle (`Test` $
ightarrow$ `Tuning` $
ightarrow$ `Retest` $
ightarrow$ `เก็บผล`)

- **Step 1: Test (การยิงทดสอบรอบแรก)**
  - รันสคริปต์ `load.test.ts` ด้วย **400 Concurrent VUs** 5-Stage Hospital Profile
  - ตรวจสอบค่า Response Time p(95), p(99) และ HTTP Error Rate
- **Step 2: Tuning (การปรับแต่งระบบ)**
  - ปรับเพิ่ม DB Connection Pool size (เช่น PostgreSQL/MySQL max_connections จาก 100 เป็น 300)
  - เพิ่ม Redis Caching สำหรับ GraphQL `GetEncounterList` และ `GetPatient`
  - ปรับเพิ่ม Kubernetes Pod Replicas (HPA) และ RAM Limit
- **Step 3: Retest (การยิงทดสอบซ้ำ)**
  - รันสคริปต์ `load.test.ts` ซ้ำด้วยพารามิเตอร์เดิม 400 VUs เพื่อยืนยันว่าจุดคอขวดถูกแก้ไขแล้ว
- **Step 4: เก็บผล (Result Collection & Reporting)**
  - เปรียบเทียบผลลัพธ์ Before vs After (ตาราง p95, p99, RPS, Error Rate และ CPU/RAM Usage)

---

### 2. ⚡ Spike Test Lifecycle (`Test` $
ightarrow$ `Tuning` $
ightarrow$ `Retest` $
ightarrow$ `เก็บผล`)

- **Step 1: Test (การยิงทดสอบรอบแรก)**
  - ยิง VUs พุ่งทะยานจาก **60 VUs ขึ้นเป็น 800 - 1,000 VUs ภายใน 30 วินาที** (จำลองคิวนัดหมายเปิด 8 โมงเช้า)
  - สังเกตว่าระบบเกิด HTTP 502/504 Gateway Timeout หรือไม่ และระบบฟื้นตัว (Recover) กลับมาได้เร็วเพียงใด
- **Step 2: Tuning (การปรับแต่งระบบ)**
  - ปรับแต่ง Nginx / Ingress Controller `worker_connections` และ `keepalive_requests`
  - ตั้งค่า Rate Limiting & Queue Buffer สำหรับ Kiosk/Reception Gateway
  - ปรับแต่ง Pod Autoscaling (HPA Scaling Thresholds ให้ขยายตัวเร็วขึ้น)
- **Step 3: Retest (การยิงทดสอบซ้ำ)**
  - ยิง Spike 1,000 VUs ซ้ำเพื่อยืนยันว่า Ingress Controller ไม่ตัดการเชื่อมต่อ และระบบ Recover ได้ใน < 1 นาที
- **Step 4: เก็บผล (Result Collection & Reporting)**
  - บันทึกระยะเวลาที่ระบบใช้ในการ Recovery (Recovery Time Objective - RTO) และสถิติ HTTP 50x Errors

---

### 3. 🔥 Stress Test Lifecycle (`Test` $
ightarrow$ `Tuning` $
ightarrow$ `Retest` $
ightarrow$ `เก็บผล`)

- **Step 1: Test (การยิงทดสอบรอบแรก)**
  - เพิ่มจำนวน VUs เกินภาระงานปกติขึ้นไปที่ **600 VUs $
ightarrow$ 800 VUs** ค้างไว้ 30 นาที
  - สังเกตว่า API ใดพังเป็นจุดแรก (First Failure Point) และเกิด DB Deadlock หรือไม่
- **Step 2: Tuning (การปรับแต่งระบบ)**
  - ปรับปรุง SQL Query Indexing และย่อย GraphQL N+1 Queries
  - ปรับแต่ง Transaction Isolation Level และ Query Timeouts
  - ปรับเพิ่ม Heap Size ของ Application Workers (Node.js `--max-old-space-size` หรือ Java `-Xmx`)
- **Step 3: Retest (การยิงทดสอบซ้ำ)**
  - ยิง Stress Test 800 VUs ซ้ำเพื่อตรวจสอบว่าจุดพังถูกขยับออกไป และไม่มี DB Deadlock เกิดขึ้น
- **Step 4: เก็บผล (Result Collection & Reporting)**
  - บันทึกขีดจำกัดสูงสุดที่ระบบรับได้ก่อนเริ่มเกิด Failure (Maximum Safe Operating Capacity)

---

### 4. ⏳ Endurance Test / Soak Test Lifecycle (`Test` $
ightarrow$ `Tuning` $
ightarrow$ `Retest` $
ightarrow$ `เก็บผล`)

- **Step 1: Test (การยิงทดสอบรอบแรก)**
  - ยิง VUs ระดับ **250 - 300 VUs ต่อเนื่องยาวนาน 2 - 12 ชั่วโมง**
  - ติดตามกราฟการใช้ RAM/CPU ของ Pods และ DB Connection Count
- **Step 2: Tuning (การปรับแต่งระบบ)**
  - แก้ไข Memory Leak ในแอปพลิเคชัน (ลบ Unhandled Event Listeners, Global State Caches)
  - ปรับปรุงการคืน DB Connection back to Pool (Fix Unclosed DB Connections)
  - ตั้งค่า Log Rotation เพื่อป้องกัน Disk Space Full
- **Step 3: Retest (การยิงทดสอบซ้ำ)**
  - รัน Endurance Test ซ้ำยาวนานเท่าเดิม เพื่อยืนยันว่ากราฟ RAM/DB Pool นิ่งเสถียรเป็นเส้นตรง (Flat Curve)
- **Step 4: เก็บผล (Result Collection & Reporting)**
  - บันทึกกราฟ RAM Trend Line 12 ชั่วโมง ยืนยันว่าไม่มี Memory Leak หรือ Resource Exhaustion

---

## 📈 ตารางบันทึกเปรียบเทียบผลลัพธ์การทดสอบ (Performance Test Results Collection Template)

| Test Type | Phase | Target VUs | Duration | p(95) Response Time | p(99) Response Time | HTTP Error Rate | Max RPS | CPU / RAM Peak | ผลการประเมิน |
|---|---|---|---|---|---|---|---|---|---|
| **Load Test** | Before Tuning | 400 VUs | 30m | 3,450 ms | 7,200 ms | 2.45% | 145 req/s | 92% CPU / 85% RAM | ❌ ไม่ผ่าน SLA |
| **Load Test** | After Tuning | 400 VUs | 30m | **1,250 ms** | **2,800 ms** | **0.05%** | **450 req/s** | **65% CPU / 60% RAM** | ✅ ผ่าน SLA |
| **Spike Test** | Before Tuning | 1,000 VUs | 10m | 8,900 ms | 15,400 ms | 12.30% | 210 req/s | 100% CPU (Timeout) | ❌ 502 Bad Gateway |
| **Spike Test** | After Tuning | 1,000 VUs | 10m | **1,850 ms** | **3,900 ms** | **0.20%** | **680 req/s** | **78% CPU (Auto-scale)**| ✅ Recover ใน 45s |
| **Stress Test** | Before Tuning | 800 VUs | 45m | 5,600 ms | 11,200 ms | 5.80% | 290 req/s | DB Connection Max | ❌ DB Deadlock |
| **Stress Test** | After Tuning | 800 VUs | 45m | **1,600 ms** | **3,400 ms** | **0.15%** | **590 req/s** | **72% CPU / 70% RAM** | ✅ รองรับ 800 VUs |
| **Endurance** | Before Tuning | 300 VUs | 4h | 2,100 ms | 4,500 ms | 1.10% | 210 req/s | RAM เพิ่มเรื่อยๆ (Leak) | ❌ OOM Killed |
| **Endurance** | After Tuning | 300 VUs | 4h | **1,150 ms** | **2,300 ms** | **0.02%** | **220 req/s** | **RAM นิ่งเสถียรที่ 45%** | ✅ ไม่มี Memory Leak |


---

# ⚖️ ตัวอย่างการกำหนด Weight และการกระจายสัดส่วน Traffic Mix ใน Grafana k6

ใน Grafana k6 มีแนวทางหลัก 2 รูปแบบในการทำ **Scenario Weighting (ถ่วงน้ำหนักกระจายภาระงานตาม % ผู้ใช้จริง)**:

---

## 1. รูปแบบที่ 1: การคำนวณ Weight สำหรับแบ่ง VUs แยก Scenario (Scenario VU Allocation Model)

วิธีนี้จะคำนวณโควตา Virtual Users (VUs) ให้แต่ละ Scenario โดยอ้างอิงจาก `defaultWeight` (เช่น OPD Registration = 38, IPD Bed List = 15, Reception = 10 ฯลฯ) จากจำนวน `TOTAL_VUS = 400`

### 📐 สูตรการคำนวณโควตา VUs (Largest Remainder Method):

$$\text{Target VU}_i = \text{Round}\left( \frac{\text{Weight}_i}{\sum \text{Weights}} \times \text{TOTAL\_VUS} \right)$$

### 💻 ตัวอย่างโค้ดฟังก์ชันกระจาย VUs ตาม Weight (`src/config/workloads/build-scenarios.ts`)

```typescript
import type { Options } from 'k6/options';

export interface ScenarioDefinition {
  key: string;
  exec: string;
  defaultWeight: number; // น้ำหนักผู้ใช้งานจากไฟล์ Excel
}

// รายการ Scenarios พร้อม Weight จากไฟล์ Data.xlsx
export const TRAFFIC_MIX: readonly ScenarioDefinition[] = [
  { key: 'opdRegistration', exec: 'opdRegistrationFlow', defaultWeight: 38 }, // 33.63% -> 135 VUs
  { key: 'ipdBedList', exec: 'ipdBedListFlow', defaultWeight: 15 },           // 13.27% -> 53 VUs
  { key: 'reception', exec: 'receptionFlow', defaultWeight: 10 },             // 8.85% -> 35 VUs
  { key: 'report', exec: 'reportFlow', defaultWeight: 8 },                    // 7.08% -> 28 VUs
  { key: 'opdPharmacy', exec: 'opdPharmacyFlow', defaultWeight: 7 },           // 6.19% -> 25 VUs
  { key: 'labWorklist', exec: 'labWorklistFlow', defaultWeight: 7 },           // 6.19% -> 25 VUs
  { key: 'labSpecimen', exec: 'labSpecimenFlow', defaultWeight: 6 },           // 5.31% -> 21 VUs
  { key: 'bedManagement', exec: 'bedManagementFlow', defaultWeight: 6 },       // 5.31% -> 21 VUs
  { key: 'cashierOpd', exec: 'cashierOpdFlow', defaultWeight: 6 },             // 5.31% -> 21 VUs
  { key: 'radiologyTask', exec: 'radiologyTaskFlow', defaultWeight: 4 },       // 3.54% -> 14 VUs
  { key: 'ipdPharmacy', exec: 'ipdPharmacyFlow', defaultWeight: 3 },           // 2.65% -> 11 VUs
  { key: 'cashierIpd', exec: 'cashierIpdFlow', defaultWeight: 3 },             // 2.65% -> 11 VUs
];

// ฟังก์ชันคำนวณสัดส่วน VUs เป็นจำนวนเต็ม (Integers) ให้ครบ 400 VUs เป๊ะ
export function allocateVus(totalVus: number, scenarios: readonly ScenarioDefinition[]): Record<string, number> {
  const totalWeight = scenarios.reduce((sum, s) => sum + s.defaultWeight, 0);
  const result: Record<string, number> = {};

  scenarios.forEach((s) => {
    // คำนวณตามสัดส่วน Weight
    result[s.key] = Math.round((s.defaultWeight / totalWeight) * totalVus);
  });

  return result;
}
```

---

## 2. รูปแบบที่ 2: การใช้ `randomSwitch` สุ่มเลือกการยิงตาม % Weight ภายใน VU เดียวกัน

หากต้องการให้ **1 VU สามารถสลับยิงไปตามแผนกต่างๆ ตามสัดส่วน % (Probability Weight)** สามารถใช้ `randomSwitch` จากไลบรารี `k6/execution` หรือคณิตศาสตร์สุ่มเปอร์เซ็นต์ได้ดังนี้:

### 💻 ตัวอย่างโค้ดการทำ Weighting ด้วย `randomSwitch` ใน `default function()`

```typescript
import { sleep } from 'k6';
import { receptionFlow } from './scenarios/reception.ts';
import { opdClinicFlow } from './scenarios/opd-clinic.ts';
import { opdPharmacyFlow } from './scenarios/opd-pharmacy.ts';
import { cashierFlow } from './scenarios/cashier.ts';

export function default() {
  // สุ่มตัวเลขเปอร์เซ็นต์ระหว่าง 0 ถึง 100
  const rand = Math.random() * 100;

  if (rand < 33.63) {
    // 33.63% Weight -> ไหลเข้าแผนก OPD Registration (38/113)
    opdClinicFlow();
  } else if (rand < 33.63 + 13.27) {
    // 13.27% Weight -> ไหลเข้าแผนก IPD Bed List (15/113)
    ipdBedListFlow();
  } else if (rand < 33.63 + 13.27 + 8.85) {
    // 8.85% Weight -> ไหลเข้าแผนก Reception (10/113)
    receptionFlow();
  } else if (rand < 33.63 + 13.27 + 8.85 + 7.08) {
    // 7.08% Weight -> ไหลเข้าแผนก Report (8/113)
    reportFlow();
  } else if (rand < 33.63 + 13.27 + 8.85 + 7.08 + 6.19) {
    // 6.19% Weight -> ไหลเข้าห้องยา OPD Pharmacy (7/113)
    opdPharmacyFlow();
  } else {
    // 30.98% Weight -> ไหลเข้าแผนกอื่นๆ (Cashier, Lab, Radiology)
    cashierFlow();
  }

  // Think time สลับรอบการสุ่ม
  sleep(2);
}
```

---

## 3. ตารางสรุปเปรียบเทียบการทำ Weight ใน k6

| รูปแบบการทำ Weight | วิธีการทำงาน | ข้อดี | เหมาะสำหรับ |
|---|---|---|---|
| **1. Multi-Scenario Allocation** (ศุนย์กลางคำนวณ VUs) | คำนวณ VUs ล่วงหน้าให้แต่ละ Scenario | ควบคุมจำนวน VUs/เจ้าหน้าที่ประจำจุดได้เป๊ะ (เช่น OPD 135 VUs, Reception 35 VUs) | **Load Test โรงพยาบาล**, **จำลองจำนวนเครื่องจริง** |
| **2. In-Scenario Weighted Random** (สุ่มใน VU เดียวกัน) | ใช้ `Math.random()` สุ่มเลือกยิง API ตาม % Weight | เขียนสคริปต์ง่าย ใช้เพียง 1 Scenario หลัก | **API Microservice Test**, **Web Traffic Random Journey** |
| **3. Arrival Rate Weighted** (`ramping-arrival-rate`) | กำหนด Target RPS (Requests/sec) แยกตาม Scenario Weight | ควบคุมจำนวน Request Throughput ไม่ขึ้นกับ Response Time | **Open Model Throughput Test** |
