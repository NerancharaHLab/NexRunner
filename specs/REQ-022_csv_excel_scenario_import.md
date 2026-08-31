# REQ-022: Import Scenarios via CSV/Excel

**Status:** 🔲 Backlog — not started, not yet planned
**Priority:** P4 (ผู้ใช้ยืนยันย้ายไปทำสุดท้าย 2026-08-31)

## Context

ผู้ใช้ขอระหว่างที่กำลังวางแพลน User Management (REQ-004) พอดี บันทึกคิวไว้ก่อน จะวางแพลนแยกเป็นเรื่องใหม่หลัง
Task Priority สูงกว่าเสร็จหมดก่อน (คนละ Subsystem กัน ไม่รวมแพลนเดียวกันเพื่อไม่ให้ Scope ปนกัน).

## Open questions (ยังไม่ได้ถาม)

- Column Mapping จะกำหนดยังไง (Fixed Header หรือ Config เอง)
- Create-only หรือ Update ด้วย (ถ้า Scenario ID ซ้ำจะทับหรือ Skip)
- มี Template ให้ดาวน์โหลดไหม
- Validate ยังไงถ้าข้อมูลผิด Format บางแถว (Fail ทั้งไฟล์ หรือ Skip แถวที่ผิด)

Must go through EnterPlanMode + AskUserQuestion for these before implementing, per house rule.
