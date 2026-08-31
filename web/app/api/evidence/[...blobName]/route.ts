import { NextResponse } from "next/server";
import { downloadEvidenceBlob } from "@/lib/azure/blob";
import { requireApiUser } from "@/lib/auth/guard";

interface RouteParams {
  params: Promise<{ blobName: string[] }>;
}

// GET /api/evidence/[...blobName]
// Auth-gated proxy that streams evidence image bytes back out — the
// "evidence" Blob container is private (no anonymous public read), so every
// <img> in the app points here instead of a direct blob URL, keeping images
// behind the same session check as every other read.
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { blobName: segments } = await params;
  const blobName = segments.map((s) => decodeURIComponent(s)).join("/");

  const blob = await downloadEvidenceBlob(blobName);
  if (!blob) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": blob.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
