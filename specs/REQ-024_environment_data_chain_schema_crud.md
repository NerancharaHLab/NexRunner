# REQ-024: Environment List / Data Chain Field Schema CRUD

**Status:** 🔲 Backlog — not started, not urgent
**Priority:** P2

## Context

ตอนนี้ยังเป็น Static Config ใน `web/lib/config.ts` (`ENVIRONMENTS`, `DATA_CHAIN_FIELDS`) — ผลจากการตัดสินใจ
ตอนทำ REQ-019 ที่เลือกไม่ย้าย Config นี้เข้า DB รอบนั้น. ยังไม่จำเป็นเร่งด่วน เพราะรายการ Environment และ Data
Chain Field Schema แทบไม่เปลี่ยนบ่อย.

No implementation started; no open design questions recorded yet — would need scoping
(AskUserQuestion) on whether this becomes a new Table + admin CRUD pages (mirroring
Suites/Tags), or something lighter, before any EnterPlanMode work begins.
