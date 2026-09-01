// Superseded by `npm run db:seed` (web/prisma/seed.ts) — kept only for history. This file predates
// multi-role support: it still calls createUser() with a singular `role` field and reads
// `existing.role`, neither of which exist anymore (createUser() takes `roles: Role[]` — see the
// FIXME below), so running this file as-is will fail to compile/run. Use
// `npm run db:seed -- <email> <password> <displayName>` instead.

// One-off: creates the first `admin` user (there's no self-signup).
//
// Usage (run from web/ so its .env.local is picked up):
//   cd web && npx tsx ../temp_scripts/seed_admin_user.ts <email> <password> <displayName>

import { createUser, getUserByEmail } from "../web/lib/db/users-table";
import { hashPassword } from "../web/lib/auth/password";

async function main() {
  const [email, password, displayName] = process.argv.slice(2);
  if (!email || !password || !displayName) {
    console.error(
      "Usage: npx tsx ../temp_scripts/seed_admin_user.ts <email> <password> <displayName>"
    );
    process.exit(1);
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    // FIXME: existing.role no longer exists (see header comment) — this line is broken.
    console.error(`User ${email} already exists (role: ${existing.role}) — not overwriting.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  // FIXME: createUser() takes `roles: Role[]`, not a singular `role` — this line is broken.
  await createUser({ email, passwordHash, displayName, role: "admin" });
  console.log(`Created admin user: ${email} (${displayName})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
