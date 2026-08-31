import { odata } from "@azure/data-tables";
import type { Role, UserEntity } from "@/lib/types";
import { getTable } from "./client";

const USERS_TABLE = "Users";
const USER_PARTITION = "USER";

async function getUsersTable() {
  return getTable(USERS_TABLE);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  displayName: string;
  roles: Role[];
}): Promise<UserEntity> {
  const table = await getUsersTable();
  const entity: UserEntity = {
    partitionKey: USER_PARTITION,
    rowKey: normalizeEmail(input.email),
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    rolesJson: JSON.stringify(input.roles),
    active: true, // new accounts always start active
    createdAt: new Date().toISOString(),
  };
  // "Replace" here means "create or overwrite" — callers must check
  // getUserByEmail() first if they need to reject duplicate emails (the
  // create-user Server Action does this).
  await table.upsertEntity(entity, "Replace");
  return entity;
}

export async function getUserByEmail(email: string): Promise<UserEntity | undefined> {
  const table = await getUsersTable();
  try {
    const entity = await table.getEntity<UserEntity>(USER_PARTITION, normalizeEmail(email));
    return entity as unknown as UserEntity;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404) return undefined;
    throw err;
  }
}

export async function listUsers(): Promise<UserEntity[]> {
  const table = await getUsersTable();
  const results: UserEntity[] = [];
  const iter = table.listEntities<UserEntity>({
    queryOptions: { filter: odata`PartitionKey eq ${USER_PARTITION}` },
  });
  for await (const entity of iter) {
    results.push(entity as unknown as UserEntity);
  }
  results.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return results;
}

export async function updateUserRoles(email: string, roles: Role[]): Promise<void> {
  const table = await getUsersTable();
  await table.updateEntity(
    { partitionKey: USER_PARTITION, rowKey: normalizeEmail(email), rolesJson: JSON.stringify(roles) },
    "Merge"
  );
}

export async function updateUserActive(email: string, active: boolean): Promise<void> {
  const table = await getUsersTable();
  await table.updateEntity(
    { partitionKey: USER_PARTITION, rowKey: normalizeEmail(email), active },
    "Merge"
  );
}

export async function updateUserPassword(email: string, passwordHash: string): Promise<void> {
  const table = await getUsersTable();
  await table.updateEntity(
    { partitionKey: USER_PARTITION, rowKey: normalizeEmail(email), passwordHash },
    "Merge"
  );
}

export async function deleteUser(email: string): Promise<void> {
  const table = await getUsersTable();
  await table.deleteEntity(USER_PARTITION, normalizeEmail(email));
}
