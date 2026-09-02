import { NextResponse } from "next/server";
import { CreateRunError, lockRun } from "@/lib/runs";
import { requireApiUser } from "@/lib/auth/guard";

interface RouteParams {
  params: Promise<{ site: string; runId: string }>;
}

// POST /api/runs/[site]/[runId]/lock -> Lock a Run (REQ-031).
// Any authenticated user, not requireApiRole(CAN_EDIT_CONTENT) — the Scenario Board this button
// lives on already has no role restriction (any of admin/qa_lead/qa_engineer can Pass/Fail/Note/
// attach Evidence on any Run), and Lock follows that same boundary: the QA who ran it locks it
// themselves when done. Unlock (the escalation-required side) is the one gated to admin/qa_lead —
// see unlock/route.ts.
export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { site, runId } = await params;

  try {
    const run = await lockRun(site, runId, auth.user.email);
    return NextResponse.json({ run });
  } catch (err) {
    if (err instanceof CreateRunError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
