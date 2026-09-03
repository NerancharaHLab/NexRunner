import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// REQ-041: Evidence screenshot storage — moved off Azure Blob Storage (lib/azure/blob.ts, deleted)
// to SeaweedFS, via its S3-compatible gateway. Same 3-function exported surface/signatures as the
// Azure version it replaces, so the 2 call sites (lib/runs.ts, app/api/evidence/[...blobName]/
// route.ts) needed only an import-path change — "translate at the edges" like the rest of this app.

const DEFAULT_BUCKET = "evidence";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.local.example to .env.local (defaults to the local ` +
        "SeaweedFS container's S3 gateway) and run `npm run db:up` (brings up both Postgres and " +
        "SeaweedFS)."
    );
  }
  return value;
}

function bucketName(): string {
  return process.env.S3_BUCKET || DEFAULT_BUCKET;
}

let client: S3Client | undefined;
let ensured = false;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: requiredEnv("S3_ENDPOINT"),
      // SeaweedFS (and most self-hosted S3-compatible stores) only support path-style addressing
      // (bucket-in-path), not AWS's default virtual-hosted-style (bucket-as-subdomain).
      forcePathStyle: true,
      // SeaweedFS ignores the region entirely, but the SDK requires a non-empty value — a fixed
      // placeholder is the standard convention for S3-compatible-but-not-AWS targets.
      region: "us-east-1",
      credentials: {
        accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

async function ensureBucket(): Promise<void> {
  if (ensured) return;
  try {
    await getClient().send(new CreateBucketCommand({ Bucket: bucketName() }));
  } catch (err: unknown) {
    // Already exists — fine either way, same tolerant "createIfNotExists" shape the Azure version
    // had (its BucketAlreadyOwnedByYou/BucketAlreadyExists equivalents).
    const name = (err as { name?: string })?.name;
    if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") throw err;
  }
  ensured = true;
}

export async function uploadEvidenceBlob(
  blobName: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  await ensureBucket();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: blobName,
      Body: data,
      ContentType: contentType,
    })
  );
}

export async function deleteEvidenceBlob(blobName: string): Promise<void> {
  await ensureBucket();
  // DeleteObjectCommand is idempotent on S3-compatible APIs (a delete of a missing key still
  // returns success) — same "delete if exists, no error either way" contract the Azure version's
  // deleteIfExists() had, with no extra try/catch needed here.
  await getClient().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: blobName }));
}

export async function downloadEvidenceBlob(
  blobName: string
): Promise<{ data: Buffer; contentType: string } | undefined> {
  await ensureBucket();
  try {
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: bucketName(), Key: blobName })
    );
    const chunks: Buffer[] = [];
    // @ts-expect-error — Body is a Node.js Readable in the server runtime this app always runs in
    // (Next.js Server Components/API routes, never the browser build of the SDK).
    for await (const chunk of result.Body) {
      chunks.push(chunk as Buffer);
    }
    return { data: Buffer.concat(chunks), contentType: result.ContentType || "application/octet-stream" };
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === "NoSuchKey") return undefined;
    throw err;
  }
}
