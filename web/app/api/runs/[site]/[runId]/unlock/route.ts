import { NextResponse } from "next/server";
import { CreateRunError, unlockRun } from "@/lib/runs";
import { requireApiRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface RouteParams {
  params: Promise<{ site: string; runId: string }>;
}

// POST /api/runs/[site]/[runId]/unlock -> Unlock a Run (REQ-031). Restricted to admin/qa_lead
// (the escalation-required side of Lock/Unlock — see lock/route.ts for why Lock itself isn't
// restricted this way). Body: { reason: string } — required, logged to RunLockEvent.
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiRole(CAN_EDIT_CONTENT);
  if ("error" in auth) return auth.error;

  const { site, runId } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: string };

  try {
    const run = await unlockRun(site, runId, auth.user.email, body.reason ?? "");
    return NextResponse.json({ run });
  } catch (err) {
    if (err instanceof CreateRunError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
