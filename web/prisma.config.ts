import path from "node:path";
import { defineConfig, env } from "prisma/config";

// The Prisma CLI (migrate/studio/etc.) runs as a standalone Node process, not through Next.js, so
// .env.local isn't loaded automatically — same reason e2e/global-setup.ts loads it explicitly. See
// specs/REQ-029_postgres_migration.md at the repo root.
try {
  process.loadEnvFile(path.resolve(__dirname, ".env.local"));
} catch {
  // Already loaded, or .env.local doesn't exist yet (e.g. fresh checkout before `cp
  // .env.local.example .env.local`) — env("DATABASE_URL") below will error with a clear message.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
