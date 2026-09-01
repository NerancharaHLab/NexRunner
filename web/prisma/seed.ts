// Optional convenience seed — creates the first `admin` user (there's no self-signup flow). Not
// required for E2E (e2e/global-setup.ts seeds its own fixture users/site/scenarios independently)
// or for local dev generally; run this only if you want an admin account to log in with by hand.
// See specs/REQ-029_postgres_migration.md at the repo root.
//
// Usage (from web/):
//   npm run db:seed -- <email> <password> <displayName>

import { createUser, getUserByEmail } from "../lib/db/users-table";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const [email, password, displayName] = process.argv.slice(2);
  if (!email || !password || !displayName) {
    console.error("Usage: npm run db:seed -- <email> <password> <displayName>");
    process.exit(1);
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    console.error(`User ${email} already exists — not overwriting.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await createUser({ email, passwordHash, displayName, roles: ["admin"] });
  console.log(`Created admin user: ${email} (${displayName})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
