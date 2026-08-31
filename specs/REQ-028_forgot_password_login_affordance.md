# REQ-028: "ลืมรหัสผ่าน?" (Forgot Password?) affordance on the Login page

**Status:** ✅ Done
**Priority:** P2

## Context

ผู้ใช้ขอปุ่ม Reset Password + ปุ่ม Contact Admin บนหน้า Login สำหรับกรณีลืมรหัสผ่าน ระบบยังไม่มี Email Infra
ส่ง Reset Link จริงได้ (ตัดสินใจไว้ตั้งแต่ REQ-004 — Reset Password ที่มีอยู่ตอนนี้เป็น Self-service เปลี่ยนรหัส
ตอน Login อยู่แล้วเท่านั้น) ยืนยันผ่าน AskUserQuestion ให้รวมเป็น**ปุ่มเดียว** "ลืมรหัสผ่าน?" ที่กดแล้วเปิด
ข้อความบอกให้ติดต่อ Admin ที่ `neranchara.kae@hlabconsulting.com` แทนการเป็น Flow Reset จริง.

## Implementation

`web/app/login/page.tsx` — native `<details><summary>ลืมรหัสผ่าน?</summary>...</details>` disclosure
below the password field (zero-JS, no new client component needed for something this small).
Revealed content: message + a `mailto:neranchara.kae@hlabconsulting.com` link.

CSS: `.forgot-password` in `globals.css` (no existing `<details>`/`<summary>` styling in this
codebase yet).

`data-testid`s: `login:btn__forgot-password` (the `<summary>`), `login:text__forgot-password-info`
(the revealed paragraph), `login:link__contact-admin` (the mailto link).

**Feedback fix (post-first-pass):** ผู้ใช้ทักว่า `<summary>` แบบดั้งเดิม (สีลิงก์เฉย ๆ ไม่มี underline/hover/
ไอคอน) ดูไม่สื่อว่าเป็นปุ่มกดได้ — ปรับเพิ่ม: chevron ▸ ที่หมุน 90° เป็น ▾ ตอนเปิด (`.forgot-password[open]
summary::before`), underline ที่โผล่ตอน hover (`text-decoration-color: transparent` → `currentColor`),
พื้นหลัง pill โผล่ตอน hover (`var(--bg-subtle)`) ให้ตรงกับ affordance ของ `.btn` อื่นในระบบ.

## Verification Log

- [x] `npm run build` ผ่านสะอาด
- [x] `npm run test:e2e` 24/24 (Additive เท่านั้น ไม่แตะ Input/Submit เดิม)
- [x] Manual/Puppeteer Verify: Toggle ปิดโดย Default (`open` = false), กดแล้วเปิด (`open` = true), เห็นข้อความ
  "ระบบยังไม่รองรับการรีเซ็ตรหัสผ่านอัตโนมัติ..." + mailto link `neranchara.kae@hlabconsulting.com` ถูกต้อง —
  ยืนยันด้วย screenshot ทั้งสถานะ collapsed และ expanded หลังปรับ CSS ตาม feedback ด้านบน
