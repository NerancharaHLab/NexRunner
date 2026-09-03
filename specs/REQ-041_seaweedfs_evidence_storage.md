# REQ-041: Migrate Evidence storage from Azure Blob Storage to SeaweedFS

**Status:** ✅ Implemented and verified (2026-09-03)
**Priority:** P2

## Context

Real architectural decision from the user (2026-09-03), made while reviewing the published System
Map artifact: Evidence image storage (screenshots attached to Scenario results) moves off Azure
Blob Storage to SeaweedFS. No real SeaweedFS endpoint exists yet — same situation REQ-027 was in
for Postgres/app hosting: prepare the code, local dev, and docs now; real production
endpoint/credentials come later from whoever provisions it.

Confirmed via AskUserQuestion:
1. **Connect via SeaweedFS's S3-compatible gateway** (`@aws-sdk/client-s3`), not Azure's SDK and
   not SeaweedFS's own native Filer HTTP API — keeps the code portable to any other S3-compatible
   backend later (real S3, MinIO, ...) without another rewrite.
2. **No real SeaweedFS to point at yet** — prepare code + a real local-dev SeaweedFS container +
   handoff documentation, same shape as REQ-027's DevOps handoff.

Confirmed via code read before touching anything: the entire Azure-specific surface is exactly 3
functions in one file — `uploadEvidenceBlob`/`deleteEvidenceBlob`/`downloadEvidenceBlob`
(`lib/azure/blob.ts`) — called from exactly 2 places (`lib/runs.ts`,
`app/api/evidence/[...blobName]/route.ts`). Evidence is always private, always served back out
through this app's own auth-gated proxy route — nothing about that changes here.

## Verification done *before* writing any implementation code

Rather than trust the Docker image/flags/SDK behavior from memory, actually pulled and ran
`chrislusf/seaweedfs:latest` in `server -s3 -s3.port=8333 -dir=/data` mode standalone, confirmed
the S3 gateway comes up (`Start Seaweed S3 API Server ... at http port 8333` in its own logs), then
ran a real `@aws-sdk/client-s3` script against it (bucket create, put, get — content + content-type
both round-tripped correctly, delete, then confirmed a 404 read afterward comes back as the SDK's
own `NoSuchKey` error name with `httpStatusCode: 404`) — this is the exact shape
`downloadEvidenceBlob`'s existing 404-tolerant contract needs to keep working. All scratch
resources (container, script, temp SDK install) removed after.

## Decisions

1. **New `lib/storage/blob.ts`** replaces `lib/azure/blob.ts` (deleted) — same 3-function exported
   surface, same signatures, so the 2 call sites need only an import-path change (same
   "translate at the edges" pattern already used everywhere in this codebase). `S3Client`
   constructed with `endpoint`, `forcePathStyle: true` (required for path-style, non-AWS
   S3-compatible endpoints), a fixed `region: "us-east-1"` placeholder (SeaweedFS ignores it, the
   SDK requires a value — standard convention for S3-compatible-but-not-AWS targets).
2. **Env vars**: `AZURE_STORAGE_CONNECTION_STRING` → `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`,
   `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` (defaults to `"evidence"` in code if unset). Four separate
   vars instead of one connection-string blob — reads more directly as "where's the storage" and
   matches how S3-compatible clients are conventionally configured.
3. **Local dev**: a real `seaweedfs` service added to `docker-compose.yml` (server mode, S3 gateway
   on its own port) replaces the `azurite` npm-installed emulator entirely — this also happens to
   satisfy a line already sitting in `README.md`'s own Roadmap ("เพิ่ม Azurite (Blob) เข้า
   docker-compose.yml เดียวกัน") since it's the same shape of improvement against a different
   backend. `azurite` devDependency + npm script removed; `predev:all` now brings up both `db` and
   `seaweedfs` via Docker Compose, `dev:all` no longer needs `concurrently` for a second process.
4. **Docs updated**: `README.md`, `docs/devops_handoff.md` (env var table, "Storage Account"
   language → SeaweedFS/S3-compatible), `specs/REQ-027_provision_azure_deploy.md` (Decision #3 now
   resolved, not open), and the previously-published System Map artifact (redeployed with
   SeaweedFS in place of Azure Blob Storage in both diagrams + the stack summary, same URL).

## Verification plan (completed)

- [x] `npm run build` clean.
- [x] `npm run test:e2e` full suite — 33/33 passed on a clean run (a first run showed 5 unrelated
  failures — auth/site-picker timing, nothing touching storage — traced to resource contention
  from the earlier manual Docker/SDK verification still winding down, not a real regression; a
  clean re-run confirmed 33/33, including the evidence-upload test in `04-scenario-board.spec.ts`).
- [x] `docker compose up -d` — both `db` and `seaweedfs` came up healthy (after fixing the
  healthcheck itself, see below). Manual Playwright script against the real running app + real
  SeaweedFS container: upload → a real object appears in the bucket (confirmed via a direct
  `ListObjectsV2Command`, not just the UI) → the app's own `/api/evidence/...` proxy route serves
  it back with the correct `image/png` content-type → lightbox opens → delete → the object is
  genuinely gone from the bucket afterward (confirmed the same way). All real, not mocked.
- [x] Redeployed the System Map artifact (same URL) with SeaweedFS in place of Azure Blob Storage
  in both diagrams and the stack summary.

**Real issue found and fixed during verification** (not assumed correct from memory): the
`seaweedfs` service's healthcheck (`wget http://localhost:8333`) failed forever with "connection
refused" even once the S3 gateway was genuinely up — traced to `localhost` resolving to `::1`
(IPv6) first inside the container while the server only binds IPv4. Fixed by using `127.0.0.1`
explicitly. Confirmed by testing the exact healthcheck command directly against a running
container before and after the fix.
