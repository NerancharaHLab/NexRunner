import bcrypt from "bcryptjs";

// bcryptjs (pure JS, no native bindings) — chosen over bcrypt for
// portability across serverless/edge-ish hosts. See
// ~/.claude/plans/streamed-wibbling-lamport.md for the reasoning.
const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
