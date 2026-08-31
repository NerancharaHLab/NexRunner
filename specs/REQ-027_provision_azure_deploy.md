# REQ-027: Provision real Azure resources + Deploy

**Status:** 🔲 Backlog — manual step, not started
**Priority:** P3

## Context

Provision Azure resource จริง (Static Web App + Storage Account **หรือ** Cosmos DB Table API Free
Tier) + Deploy — เป็น manual step ที่ต้องให้ SA/ทีมที่มีสิทธิ์ Azure ทำเอง มีขั้นตอนไว้ใน `web/README.md`
(รวมเงื่อนไข Cosmos DB Free Tier ที่ต้องเช็คก่อนว่า Subscription ว่างโควตา).

**หลัง Provision เสร็จต้องรัน Verification ซ้ำกับ Connection String จริงก่อนเชื่อว่าใช้ได้ — ยังไม่เคยทดสอบกับ
Cosmos DB จริง** (ดู REQ-018 สำหรับ Comment/Doc ที่เตรียมไว้รองรับ Cosmos DB Table API compatibility แล้ว).
