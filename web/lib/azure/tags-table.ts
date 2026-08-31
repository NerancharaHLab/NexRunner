// Tag Catalog — a flat, centrally-managed list of tags (admin/qa_lead only)
// attached to Master Scenarios and used by createRun()'s Include/Exclude
// filter (see lib/runs.ts). Simpler CRUD than Scenario/Suite: a Tag has no
// separately-typed id, its whole identity IS its (case-insensitive) name —
// see sanitizeTagId() in lib/types.ts — so createTag() explicitly rejects a
// case-insensitive duplicate instead of silently upserting over it.
import { odata } from "@azure/data-tables";
import { sanitizeTagId, TAG_PARTITION, type TagDef, type TagEntity } from "@/lib/types";
import { getTable } from "./client";

const TAGS_TABLE = "Tags";

async function getTagsTable() {
  return getTable(TAGS_TABLE);
}

function entityToDef(e: TagEntity): TagDef {
  return { id: e.rowKey, name: e.name };
}

export async function listTags(): Promise<TagDef[]> {
  const table = await getTagsTable();
  const results: TagEntity[] = [];
  const iter = table.listEntities<TagEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${TAG_PARTITION}` },
  });
  for await (const entity of iter) {
    results.push(entity as unknown as TagEntity);
  }
  return results.map(entityToDef).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTag(id: string): Promise<TagDef | undefined> {
  const table = await getTagsTable();
  try {
    const entity = await table.getEntity<TagEntity>(TAG_PARTITION, id);
    return entityToDef(entity as unknown as TagEntity);
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404) return undefined;
    throw err;
  }
}

export class TagAlreadyExistsError extends Error {}

/** Rejects a case-insensitive duplicate (e.g. "Smoke" when "smoke" already exists) instead of
 *  silently overwriting it — unlike Scenario/Suite, a Tag has no separate id a caller could
 *  intentionally re-target for an upsert-by-id flow. */
export async function createTag(name: string): Promise<TagDef> {
  const trimmed = name.trim();
  const id = sanitizeTagId(trimmed);
  if (!id) throw new Error("Tag name is required");
  const existing = await getTag(id);
  if (existing) {
    throw new TagAlreadyExistsError(`Tag "${existing.name}" already exists (case-insensitive)`);
  }
  const table = await getTagsTable();
  const entity: TagEntity = { partitionKey: TAG_PARTITION, rowKey: id, name: trimmed };
  await table.upsertEntity(entity, "Replace");
  return { id, name: trimmed };
}

export async function deleteTag(id: string): Promise<void> {
  const table = await getTagsTable();
  await table.deleteEntity(TAG_PARTITION, id);
}
