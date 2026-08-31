import { TableClient } from "@azure/data-tables";

// Shared Table Storage client factory used by every azure/*-table.ts module
// (tables.ts for Runs/ScenarioResults, users-table.ts, scenarios-table.ts,
// sites-table.ts). Azure Cosmos DB's "Table API" is wire-compatible with the
// same SDK and connection-string shape (Free Tier: 1000 RU/s + 25GB storage,
// forever, one per subscription) — swapping AZURE_STORAGE_CONNECTION_STRING
// to a Cosmos DB Table API connection string is meant to be a config-only
// change, no code edits here. See web/README.md "Cosmos DB Free Tier" for the
// exact steps + a caveat on the once-per-subscription free tier limit. NOT
// yet verified against a real Cosmos DB Table API endpoint (only tested
// against Azurite + real Azure Table Storage so far) — re-run the
// verification steps in that README section once a real Cosmos DB connection
// string is available.

function connectionString(): string {
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!cs) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is not set. Copy .env.local.example to .env.local " +
        "(defaults to the local Azurite emulator connection string) and run `npx azurite`."
    );
  }
  return cs;
}

// Table clients are cheap to construct; we don't need to cache them across
// requests, but we do need to make sure each table exists before first use.
const ensuredTables = new Set<string>();

export async function getTable(tableName: string): Promise<TableClient> {
  const client = TableClient.fromConnectionString(connectionString(), tableName, {
    // Only needed for Azurite's http:// endpoint in local dev — has no effect
    // once AZURE_STORAGE_CONNECTION_STRING points at a real https:// endpoint
    // (real Azure Storage or Cosmos DB Table API), so this stays on unconditionally.
    allowInsecureConnection: true,
  });
  if (!ensuredTables.has(tableName)) {
    await client.createTable().catch((err: unknown) => {
      // 409 = table already exists, which is fine.
      const status = (err as { statusCode?: number })?.statusCode;
      if (status !== 409) throw err;
    });
    ensuredTables.add(tableName);
  }
  return client;
}
