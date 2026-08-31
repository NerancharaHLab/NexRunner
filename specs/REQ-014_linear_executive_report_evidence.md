# REQ-014: Linear Report export + Executive Report page + Evidence Upload

**Status:** ✅ Done
**Priority:** P1

## Context

ผู้ใช้ถามหาฟีเจอร์เหล่านี้หลัง Migration แล้วยืนยันให้ทำทั้ง 3 พร้อมกัน (Linear Export แบบ Generate+Copy เหมือน
เดิม ไม่ยิง API ตรง).

## Implementation & Verification Log

- [x] Schema: เพิ่ม `EvidenceItem`, `evidenceJson` ใน `ScenarioResultEntity`, ค่าคงที่
  `EVIDENCE_MAX_PER_SCENARIO`/`EVIDENCE_MAX_FILE_SIZE_BYTES`/`EVIDENCE_ALLOWED_CONTENT_TYPES`
  (`web/lib/types.ts`) — `getRunDetail()` parse `evidenceJson` เป็น Array แล้ว (`web/lib/runs.ts`) เพิ่ม
  `addEvidence()`/`removeEvidence()` (Upload/Delete Blob + Merge Upsert Entity โดยไม่แตะ
  Status/Notes/Run Metrics)
- [x] `web/lib/azure/blob.ts` — Blob Storage Client Factory (Container `evidence`, Private Access,
  `createIfNotExists` แบบ Memoized เหมือน `client.ts`) — ใช้ `AZURE_STORAGE_CONNECTION_STRING` เดิม ไม่ต้อง
  เพิ่ม Env/Package ใหม่
- [x] API Routes: `POST .../scenarios/[scenarioId]/evidence` (multipart `file`), `DELETE
  .../evidence/[evidenceId]`, `GET /api/evidence/[...blobName]` (Auth-gated Proxy Stream Bytes —
  Container เป็น Private ไม่มี Public URL)
- [x] CSS ใหม่ใน `globals.css` — `.modal-overlay`/`.modal-card` (ใช้ร่วมกันทั้ง Linear Report Modal และ
  Lightbox), `.evidence-area`/`.evidence-pastezone`/`.evidence-thumbs`/`.evidence-thumb`,
  `.report-paper`/`.report-header`/`.gate-banner`/`.report-table`/`.kpi-grid`/`.signature-section` +
  `@media print` (ซ่อน `.no-print`)
- [x] Evidence UI ใน `ScenarioBoard.tsx` — ปุ่มแนบรูป + Hidden File Input + Paste Zone (Ctrl+V) + Thumbnail
  Strip + ปุ่มลบต่อรูป + Lightbox Overlay ระดับ ScenarioBoard (State เดียวใช้ร่วมทุก Scenario) — Evidence ไม่
  ใช่ Optimistic Update เหมือน Status/Notes (รอผลจาก Server ก่อนเพราะ id/blobName สร้างฝั่ง Server)
- [x] `LinearReportModal.tsx` (`"use client"`, Client-only ไม่ต้องยิง Server เพราะ ScenarioBoard มี
  Run+Scenario State อยู่แล้ว) + ปุ่ม "สรุปผลส่ง Linear" ใน `ScenarioBoard.tsx` — Copy ผ่าน
  `navigator.clipboard.writeText` มี Fallback เป็น `document.execCommand('copy')`
- [x] Executive Report page (`web/app/[site]/[runId]/executive-report/page.tsx` + `PrintButton.tsx`) —
  ใช้ `getRunDetail()` เดิมไม่ต้องแก้ Data Layer เพิ่ม, พอร์ต Header/Gate Banner/Traceability
  Table/KPI Grid/Critical Matrix/Defect Log/Signature Block จาก `executive_report.html` เดิม (ไม่มี
  Evidence ในหน้านี้ ตรวจสอบแล้วของเดิมก็ไม่มี) เพิ่ม Link จาก Run Detail
- [x] เพิ่ม Note เตือนเรื่อง Cosmos DB Table API ไม่มี Blob เทียบเท่าใน `web/README.md` (ต้องมี Storage
  Account แยกสำหรับ Evidence ถ้าสุดท้ายเลือก Cosmos DB สำหรับ Table)
- [x] `npm run build` ผ่านสะอาด — Route ใหม่ขึ้นครบ (`/[site]/[runId]/executive-report`,
  `/api/evidence/[...blobName]`, `/api/runs/.../evidence`, `/api/runs/.../evidence/[evidenceId]`)
- [x] ตรวจสอบด้วย Puppeteer จริง + Screenshot ทุกหน้าที่เปลี่ยน — Login → Run Detail (ปุ่มใหม่ครบ) → เปิด
  Linear Report Modal ยืนยันข้อความตรงกับข้อมูลจริง (17 Pass, 100%, READY) → เปิด Executive Report ยืนยัน
  KPI/Critical Matrix/Defect Log ตรงกับข้อมูลจริง → ทดสอบ `@media print` ด้วย `page.emulateMediaType('print')`
  ยืนยันว่า TopNav/Breadcrumb/ปุ่ม Print ถูกซ่อนถูกต้อง เหลือแค่ Report เต็มความกว้าง → Upload Evidence ผ่าน
  File Input จริง ยืนยัน Thumbnail ขึ้น (1/6) และ `GET /api/evidence/...` เสิร์ฟรูปได้ → คลิก Thumbnail เปิด
  Lightbox สำเร็จ → ลบรูป ยืนยันกลับเป็น (0/6)

## Known limitations found during verification (not bugs)

1. `navigator.clipboard.writeText` ถูก Headless Chrome ปฏิเสธด้วย `NotAllowedError` แม้ Grant Permission
   แล้ว (เป็นข้อจำกัดของ Headless Automation เอง ตรวจสอบแยกด้วย `page.evaluate` ยืนยันว่าไม่ใช่ Bug โค้ด —
   Textarea เนื้อหาถูกต้องและ Select ได้ ผู้ใช้จริงใน Browser ปกติจะ Copy ได้)
2. Run `NUH-RUN-001` ที่ใช้ทดสอบสร้างไว้ตั้งแต่ก่อน Fix เอา 🏥 ออกจาก `sites.json` ทำให้ `run.siteName` ที่
   Snapshot ไว้ตอนสร้าง Run ยังมี Emoji ค้างอยู่ (เห็นใน Linear Report/Executive Report) — เป็น Data เก่าจาก
   Run ก่อนหน้า ไม่ใช่ Bug ใหม่ Run ที่สร้างใหม่หลังจากนี้จะไม่มีปัญหานี้

Also encountered mid-verification: dev server เก่าค้าง Process จากรอบก่อนหน้าทำให้ Evidence Upload Error
"Failed to parse body as FormData" (เป็น Process เก่าค้าง ไม่ใช่ Bug จริง) แก้โดย `pkill` แล้ว Restart Server
สะอาดใหม่ก็ผ่านปกติ.
