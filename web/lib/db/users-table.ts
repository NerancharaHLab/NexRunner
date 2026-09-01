import type { Role, UserEntity } from "@/lib/types";
import { prisma } from "./client";

// Prisma-backed replacement for the old Table Storage "Users" table (see
// specs/REQ-029_postgres_migration.md at the repo root). Same exported function names/signatures as
// the old lib/azure/users-table.ts, so lib/auth/guard.ts and every call site only needed an import
// path change — this module does the translation between Postgres rows and the UserEntity shape
// (partitionKey/rowKey/rolesJson) the rest of the app already expects.

const USER_PARTITION = "USER";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toEntity(row: {
  email: string;
  passwordHash: string;
  displayName: string;
  roles: string[];
  active: boolean;
  createdAt: Date;
}): UserEntity {
  return {
    partitionKey: USER_PARTITION,
    rowKey: row.email,
    passwordHash: row.passwordHash,
    displayName: row.displayName,
    rolesJson: JSON.stringify(row.roles),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  displayName: string;
  roles: Role[];
}): Promise<UserEntity> {
  const email = normalizeEmail(input.email);
  // "Replace" semantics like the old upsertEntity(entity, "Replace") — full overwrite including
  // createdAt, if a row already existed at this email. Callers that need to reject duplicates
  // check getUserByEmail() first (see the create-user Server Action).
  const data = {
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    roles: input.roles,
    active: true,
    createdAt: new Date(),
  };
  const row = await prisma.user.upsert({
    where: { email },
    create: { email, ...data },
    update: data,
  });
  return toEntity(row);
}

export async function getUserByEmail(email: string): Promise<UserEntity | undefined> {
  const row = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  return row ? toEntity(row) : undefined;
}

export async function listUsers(): Promise<UserEntity[]> {
  const rows = await prisma.user.findMany();
  return rows.map(toEntity).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function updateUserRoles(email: string, roles: Role[]): Promise<void> {
  await prisma.user.update({ where: { email: normalizeEmail(email) }, data: { roles } });
}

export async function updateUserActive(email: string, active: boolean): Promise<void> {
  await prisma.user.update({ where: { email: normalizeEmail(email) }, data: { active } });
}

export async function updateUserPassword(email: string, passwordHash: string): Promise<void> {
  await prisma.user.update({ where: { email: normalizeEmail(email) }, data: { passwordHash } });
}

export async function deleteUser(email: string): Promise<void> {
  await prisma.user.delete({ where: { email: normalizeEmail(email) } });
}
