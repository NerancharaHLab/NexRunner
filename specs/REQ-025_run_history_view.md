# REQ-025: Run History view

**Status:** 🔲 Backlog — not started
**Priority:** P2

## Context

Originally logged together with "ผูก Entra ID Auth" as one entry; the Entra ID half was
superseded when the project moved to Email+Password auth (REQ-019). The Run History view part of
that original entry was never actually implemented and is still outstanding — this REQ tracks
just that remaining half.

Note: `app/[site]/page.tsx` already renders a basic list of Runs for a site (used throughout this
session's verification scripts) — it's unclear from the original TODO note whether "Run History
view" meant something beyond what already exists (e.g. filtering/search/pagination across Runs,
a dedicated history page distinct from the current site's run list) or was simply not yet
resolved as "done" when the note was written. Needs clarification before planning.
