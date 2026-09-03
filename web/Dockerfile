# Test Runner — production image. See docs/devops_handoff.md (repo root) for the env vars this
# image expects at runtime (DATABASE_URL, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
# S3_BUCKET, AUTH_SECRET — REQ-041 moved Evidence storage off Azure Blob Storage to SeaweedFS, so
# the 4 S3_* vars replace what used to be one AZURE_STORAGE_CONNECTION_STRING) and for the one-off
# `npx prisma migrate deploy` command that must be run once against the real database BEFORE the
# app can serve traffic. Deliberately NOT run automatically on container start (avoids a migration
# race if more than one replica starts at once) — use the `migrator` build target below for that
# instead, as its own one-off Job/step, not the default `runner` target.
#
# Multi-stage build using Next.js's `output: "standalone"` (next.config.ts) — traces only the
# node_modules the app actually needs into a small final image. This app has no native/node-gyp
# dependencies (bcryptjs is pure JS, not bcrypt), so no build-essential/python is needed anywhere.
#
# Build the app image from the `web/` directory as context:
#   cd web && docker build -t test-runner .
# Build the one-off migration image instead:
#   cd web && docker build --target migrator -t test-runner-migrate .
#   docker run --rm -e DATABASE_URL="..." test-runner-migrate

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS builder
WORKDIR /app
# Prisma's CLI/engine binaries link against system OpenSSL — node:24-slim doesn't ship it by
# default, which without this causes a real (not cosmetic) "failed to detect libssl/openssl
# version" warning from `prisma migrate deploy`/`prisma generate`, confirmed by actually running
# both inside this image during verification. Needed since production Postgres will very likely
# require a TLS connection.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `prisma generate` never actually connects to a database — it only reads schema.prisma to produce
# client code — but prisma.config.ts's env("DATABASE_URL") still throws at load time if the var is
# completely unset (confirmed: this failed in a real `docker build` here without it, even though an
# earlier local-shell test without it appeared to pass — that test was misleading, it was silently
# picking up the real .env.local present on the host machine, which .dockerignore correctly excludes
# from the build context). This placeholder is build-time only (ARG, not ENV — not baked into the
# final runner/migrator stages below) and is never used to open a real connection.
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
RUN npx prisma generate
RUN npm run build

# One-off migration image — full toolchain (unlike the slim `runner` stage below, where a selective
# node_modules copy for just the Prisma CLI was tried and confirmed broken: `prisma migrate deploy`
# failed with MODULE_NOT_FOUND on a transitive dependency it needs that a hand-picked copy missed).
# Never used as the running app's own image — build with `--target migrator` specifically.
FROM builder AS migrator
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone output doesn't include public/ or .next/static — copied in separately per Next.js's
# own documented pattern. No Prisma CLI/schema here at all — this image only ever runs the app
# itself (node server.js), which talks to Postgres through @prisma/client + the @prisma/adapter-pg
# driver adapter (lib/db/client.ts), not the Prisma CLI.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
