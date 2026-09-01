// Tag Catalog — Prisma-backed replacement for the old Table Storage "Tags" table (see
// specs/REQ-029_postgres_migration.md). Same exported function names/signatures as the old
// lib/azure/tags-table.ts. A Tag has no separately-typed id, its whole identity IS its
// (case-insensitive) name — see sanitizeTagId() in lib/types.ts — so createTag() explicitly rejects
// a case-insensitive duplicate instead of silently upserting over it.
import { MASTER_SCENARIO_PARTITION, sanitizeTagId, type TagDef } from "@/lib/types";
import { prisma } from "./client";

function rowToDef(row: { id: string; name: string }): TagDef {
  return { id: row.id, name: row.name };
}

export async function listTags(): Promise<TagDef[]> {
  const rows = await prisma.tag.findMany();
  return rows.map(rowToDef).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTag(id: string): Promise<TagDef | undefined> {
  const row = await prisma.tag.findUnique({ where: { id } });
  return row ? rowToDef(row) : undefined;
}

export class TagAlreadyExistsError extends Error {}

export async function createTag(name: string): Promise<TagDef> {
  const trimmed = name.trim();
  const id = sanitizeTagId(trimmed);
  if (!id) throw new Error("Tag name is required");
  const existing = await getTag(id);
  if (existing) {
    throw new TagAlreadyExistsError(`Tag "${existing.name}" already exists (case-insensitive)`);
  }
  await prisma.tag.create({ data: { id, name: trimmed } });
  return { id, name: trimmed };
}

/**
 * Usage count per Tag, scoped to the Master Scenario Library only (REQ-035 decision — the Tag
 * Catalog's own purpose is "attach to Master Scenarios", and a single-table scan is far cheaper
 * than also scanning every Site's cloned copies). One query, tallied in JS — realistic scenario
 * counts here are tens, not thousands, so this is simpler than a grouped SQL count and just as fast.
 */
export async function getTagUsageCounts(): Promise<Record<string, number>> {
  const masterScenarios = await prisma.scenario.findMany({
    where: { siteKey: MASTER_SCENARIO_PARTITION },
    select: { tags: true },
  });
  const counts: Record<string, number> = {};
  for (const sc of masterScenarios) {
    for (const t of sc.tags) {
      counts[t] = (counts[t] ?? 0) + 1;
    }
  }
  return counts;
}

export class TagInUseError extends Error {
  usageCount: number;
  constructor(message: string, usageCount: number) {
    super(message);
    this.usageCount = usageCount;
  }
}

/**
 * Hard-blocks deleting a Tag that's still attached to any Master Scenario (REQ-035 decision — no
 * cascade, matching the compliance/audit-safety direction of REQ-030/031/032: never let one action
 * silently rewrite data elsewhere). Same shape as sites-table.ts's deleteSite()/SiteHasRunsError.
 */
export async function deleteTag(id: string): Promise<void> {
  const usageCount = await prisma.scenario.count({
    where: { siteKey: MASTER_SCENARIO_PARTITION, tags: { has: id } },
  });
  if (usageCount > 0) {
    throw new TagInUseError(
      `This tag is used by ${usageCount} Master Scenario(s). Remove it from those scenarios first.`,
      usageCount
    );
  }
  await prisma.tag.delete({ where: { id } });
}
