// One-off: creates the first `admin` user (there's no self-signup). Run once
// against Azurite for local dev, and once more against the real Azure/Cosmos
// DB Table once that's provisioned (see web/README.md "Cosmos DB Free Tier").
//
// Usage (run from web/ so its node_modules/.env.local are picked up):
//   cd web && npx tsx --env-file=.env.local ../temp_scripts/seed_admin_user.ts <email> <password> <displayName>

import { createUser, getUserByEmail } from "../web/lib/azure/users-table";
import { hashPassword } from "../web/lib/auth/password";

async function main() {
  const [email, password, displayName] = process.argv.slice(2);
  if (!email || !password || !displayName) {
    console.error(
      "Usage: npx tsx --env-file=.env.local ../temp_scripts/seed_admin_user.ts <email> <password> <displayName>"
    );
    process.exit(1);
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    console.error(`User ${email} already exists (role: ${existing.role}) — not overwriting.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await createUser({ email, passwordHash, displayName, role: "admin" });
  console.log(`Created admin user: ${email} (${displayName})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
