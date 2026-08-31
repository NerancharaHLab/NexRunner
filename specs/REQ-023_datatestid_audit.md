# REQ-023: `data-testid` audit against `datatest-id-standard` skill

**Status:** 🔲 Backlog — partially covered ad-hoc, no formal audit done
**Priority:** P1

## Context

ใส่ `data-testid` ให้ครบทุก element ที่กด/assert ได้ ตาม pattern จาก skill `datatest-id-standard`. ทำไปบาง
ส่วนแล้วระหว่างสร้างหน้า (ครอบคลุมเยอะขึ้นมากหลัง Auth+CRUD pass — site tile, new-run form, status button,
notes input, gate badge, login form, admin users/scenarios form ทุกฟิลด์) แต่ยังไม่ได้ทำ Audit เทียบกับ
Skill ทุกจุดแบบเป็นทางการ.

## Scope when picked up

- Read `datatest-id-standard` skill again first (mandatory before any UI work per house rule).
- Grep every interactive element across `app/` for missing `data-testid`, verify naming matches
  `[module]:[component]:[element]__[modifier]` convention exactly (module = `smoke-runner`).
- No implementation started yet.
