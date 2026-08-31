import { NextResponse } from "next/server";
import { CreateRunError, updateScenarioResult, type UpdateScenarioInput } from "@/lib/runs";
import { requireApiUser } from "@/lib/auth/guard";

interface RouteParams {
  params: Promise<{ site: string; runId: string; scenarioId: string }>;
}

// PATCH /api/runs/[site]/[runId]/scenarios/[scenarioId]
// Updates one scenario's status/notes, then recomputes and persists the
// parent Run's aggregate metrics + Gate result in the same request — this is
// the server-side equivalent of the old app's updateMetrics()/setStatus().
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { site, runId, scenarioId: rawScenarioId } = await params;
  const scenarioId = decodeURIComponent(rawScenarioId);
  const body = (await request.json()) as UpdateScenarioInput;

  try {
    const result = await updateScenarioResult(site, runId, scenarioId, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof CreateRunError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
