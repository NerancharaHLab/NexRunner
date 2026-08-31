# REQ-020: Combine `npm run azurite` + `npm run dev` into one command

**Status:** ✅ Done
**Priority:** P3

## Implementation & Verification Log

- [x] เพิ่ม `concurrently` (dev dep) + Script `dev:all` ใน `web/package.json` (Label แยกสี
  `[azurite]`/`[next]`) ยังคง Script เดิมไว้ให้รันแยก 2 Terminal ได้เหมือนเดิมด้วยถ้าต้องการ
- [x] **ตรวจสอบผ่านจริง**: รัน `npm run dev:all` แล้วทั้ง Azurite (Table/Blob/Queue Service) และ Next.js
  Dev Server ขึ้นพร้อมกันจริง ยิง `curl /login` ได้ 200
- [x] อัปเดต `web/README.md` ให้แนะนำคำสั่งนี้เป็นทางเลือกหลัก
