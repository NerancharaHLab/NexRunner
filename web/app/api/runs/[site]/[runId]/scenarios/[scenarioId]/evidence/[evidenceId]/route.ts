import { NextResponse } from "next/server";
import { CreateRunError, removeEvidence } from "@/lib/runs";
import { requireApiUser } from "@/lib/auth/guard";

interface RouteParams {
  params: Promise<{ site: string; runId: string; scenarioId: string; evidenceId: string }>;
}

// DELETE /api/runs/[site]/[runId]/scenarios/[scenarioId]/evidence/[evidenceId]
export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { site, runId, scenarioId: rawScenarioId, evidenceId } = await params;
  const scenarioId = decodeURIComponent(rawScenarioId);

  try {
    const result = await removeEvidence(site, runId, scenarioId, evidenceId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CreateRunError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
