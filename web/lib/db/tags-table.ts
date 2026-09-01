// Tag Catalog — Prisma-backed replacement for the old Table Storage "Tags" table (see
// specs/REQ-029_postgres_migration.md). Same exported function names/signatures as the old
// lib/azure/tags-table.ts. A Tag has no separately-typed id, its whole identity IS its
// (case-insensitive) name — see sanitizeTagId() in lib/types.ts — so createTag() explicitly rejects
// a case-insensitive duplicate instead of silently upserting over it.
import { sanitizeTagId, type TagDef } from "@/lib/types";
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

export async function deleteTag(id: string): Promise<void> {
  await prisma.tag.delete({ where: { id } });
}
