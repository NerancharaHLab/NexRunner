import { NextResponse } from "next/server";
import { getRunDetail } from "@/lib/runs";
import { requireApiUser } from "@/lib/auth/guard";

interface RouteParams {
  params: Promise<{ site: string; runId: string }>;
}

// GET /api/runs/[site]/[runId] -> run detail: the Run entity + every scenario
// definition merged with its current result (defaulting to "notrun" for any
// scenario that has no ScenarioResults row yet).
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { site, runId } = await params;
  const detail = await getRunDetail(site, runId);
  if (!detail) {
    return NextResponse.json({ error: "Run or site not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
