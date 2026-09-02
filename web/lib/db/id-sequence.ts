import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

// System-generated running-number ids — see specs/REQ-032_running_number_id_scheme.md at the repo
// root for the full design rationale (why domain isn't embedded in the id, why the server never
// trusts a client-supplied id, why legacy free-text ids are never reformatted).

/** Any function here can run inside an interactive prisma.$transaction() (REQ-022's bulk import
 *  needs this — reserving several ids atomically alongside several createScenario() calls, all
 *  rolled back together on any failure) by passing its `tx` client through; omit it to use the
 *  global client, unchanged for every pre-existing call site. */
type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Atomically returns the next number for a given scope, creating the counter at 1 if it doesn't
 * exist yet. Prisma's upsert() compiles to `INSERT ... ON CONFLICT DO UPDATE` on Postgres, which
 * is a single atomic statement — safe under concurrent calls with no explicit row locking needed.
 */
async function nextRunningNumber(scope: string, db: Db = prisma): Promise<number> {
  const row = await db.idSequence.upsert({
    where: { scope },
    create: { scope, value: 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

/** MST-0001, MST-0002, ... — global, never reset. */
export async function nextMasterScenarioId(db: Db = prisma): Promise<string> {
  return `MST-${pad4(await nextRunningNumber("MST", db))}`;
}

/** SUT-0001, SUT-0002, ... — global, never reset. */
export async function nextSuiteId(db: Db = prisma): Promise<string> {
  return `SUT-${pad4(await nextRunningNumber("SUT", db))}`;
}

/** {SITE}-CUST-0001, ... — per-site counter, never reset. Only for Scenarios created directly at a
 *  Site (not clones — cloning keeps the Master's own MST-xxxx id unchanged). */
export async function nextCustomScenarioId(siteKey: string, db: Db = prisma): Promise<string> {
  return `${siteKey}-CUST-${pad4(await nextRunningNumber(`CUST:${siteKey}`, db))}`;
}

/** RUN-{SITE}-0001, ... — per-site counter, never reset. */
export async function nextRunId(siteKey: string, db: Db = prisma): Promise<string> {
  return `RUN-${siteKey}-${pad4(await nextRunningNumber(`RUN:${siteKey}`, db))}`;
}
