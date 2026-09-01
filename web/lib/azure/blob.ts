import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";

// Blob Storage client factory for Evidence screenshots — the one piece of storage that stayed on
// Azure when the rest of the app's data moved to PostgreSQL (see
// specs/REQ-029_postgres_migration.md at the repo root; this is the only file left in lib/azure/,
// everything else was Table Storage and has been deleted). Still uses
// AZURE_STORAGE_CONNECTION_STRING (Blob-only now — see .env.local's comment).

const EVIDENCE_CONTAINER = "evidence";

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

let containerClient: ContainerClient | undefined;
let ensured = false;

async function getContainer(): Promise<ContainerClient> {
  if (!containerClient) {
    const service = BlobServiceClient.fromConnectionString(connectionString());
    containerClient = service.getContainerClient(EVIDENCE_CONTAINER);
  }
  if (!ensured) {
    // Private container — no anonymous public read. Evidence images are
    // served back out through the auth-gated GET /api/evidence/[...blobName]
    // proxy route instead, so they stay behind the same session check as
    // every other read in this app.
    await containerClient.createIfNotExists();
    ensured = true;
  }
  return containerClient;
}

export async function uploadEvidenceBlob(
  blobName: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  const container = await getContainer();
  const blockBlob = container.getBlockBlobClient(blobName);
  await blockBlob.uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } });
}

export async function deleteEvidenceBlob(blobName: string): Promise<void> {
  const container = await getContainer();
  await container.getBlockBlobClient(blobName).deleteIfExists();
}

export async function downloadEvidenceBlob(
  blobName: string
): Promise<{ data: Buffer; contentType: string } | undefined> {
  const container = await getContainer();
  const blockBlob = container.getBlockBlobClient(blobName);
  try {
    const download = await blockBlob.downloadToBuffer();
    const props = await blockBlob.getProperties();
    return { data: download, contentType: props.contentType || "application/octet-stream" };
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404) return undefined;
    throw err;
  }
}
