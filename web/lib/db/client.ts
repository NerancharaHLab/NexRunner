import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires an explicit driver adapter (no more implicit datasource.url in schema.prisma —
// see prisma.config.ts and prisma/schema.prisma's datasource block for the CLI-side half of this).
// Shared PrismaClient singleton, cached on `globalThis` so Next.js dev's hot-reload doesn't spawn a
// fresh connection pool on every file save (the standard Prisma+Next.js pattern).

// Next.js loads .env.local automatically for the running app, but standalone Node entry points that
// import this module (e2e/global-setup.ts, temp_scripts/*.ts) don't get that for free — and since
// this file reads DATABASE_URL at module-load time (below), it can run before such a script's own
// process.loadEnvFile() line does, thanks to ESM import hoisting. Load it here too, defensively, so
// it doesn't matter which side gets there first. Wrapped in try/catch: production has no
// .env.local file at all (env vars come from the platform instead), which must not throw.
try {
  process.loadEnvFile(path.resolve(__dirname, "../../.env.local"));
} catch {
  // No .env.local (production) or already loaded — either way, fall through to process.env as-is.
}

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.local.example to .env.local, run `npm run db:up` " +
        "(starts the Docker Postgres container) and `npm run db:migrate`."
    );
  }
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(connectionString()) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
