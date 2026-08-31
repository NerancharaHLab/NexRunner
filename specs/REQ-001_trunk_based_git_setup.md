# REQ-001: Trunk-based Git Setup + Strict Project Isolation Rule

**Status:** ✅ Done
**Priority:** P1

## Context

Two governance/repo-setup tasks done back to back at the start of formal Git usage for this
project.

## Implementation & Verification Log

- [x] เพิ่มกฎ Strict Project Isolation (ห้ามอ้างอิงหรือปนข้อมูลข้ามโปรเจกต์เด็ดขาด):
  - [x] เพิ่มกฎใน `~/.gemini/config/AGENTS.md` (Global)
  - [x] เพิ่มกฎใน `AGENTS.md` (Project)
  - [x] ตรวจสอบความถูกต้องและ Commit/Push ตามมาตรฐาน Trunk-based Development
- [x] ตั้งค่า Git Repository แบบ Trunk-based Development + Conventional Commits + Release Tagging:
  - [x] สร้าง `.gitignore` ที่ระดับ Root เพื่อควบคุมไฟล์ Sensitive, Build Artifacts, Storage Emulators, และ Logs
  - [x] รัน `git init -b main` และทำ Initial Commit บน `main`
  - [x] ปรับปรุงกฎใน `~/.gemini/config/AGENTS.md` (Global) และ `AGENTS.md` (Project) เพิ่มหมวดหมู่ Git Flow & Release Strategy
  - [x] ตรวจสอบความถูกต้องของ Git Status, Rules, และความสะอาดของ Repository

Note: this repo-init/isolation-rule work was done by a separate concurrent agent/tool session
operating on this same repo (referenced `~/.gemini/config/AGENTS.md`, i.e. Gemini CLI), observed
and reported transparently rather than reverted, per the project's "don't clobber externally-
changed files" guidance.
