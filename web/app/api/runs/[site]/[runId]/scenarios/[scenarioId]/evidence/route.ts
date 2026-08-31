import { NextResponse } from "next/server";
import { addEvidence, CreateRunError } from "@/lib/runs";
import { requireApiUser } from "@/lib/auth/guard";

interface RouteParams {
  params: Promise<{ site: string; runId: string; scenarioId: string }>;
}

// POST /api/runs/[site]/[runId]/scenarios/[scenarioId]/evidence
// Uploads one screenshot (multipart/form-data, field name "file") and
// appends it to that scenario's evidence list.
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { site, runId, scenarioId: rawScenarioId } = await params;
  const scenarioId = decodeURIComponent(rawScenarioId);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await addEvidence(site, runId, scenarioId, {
      buffer,
      contentType: file.type || "application/octet-stream",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CreateRunError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
