import { NextRequest, NextResponse } from "next/server";
import { listRunsForSite } from "@/lib/db/tables";
import { createRun, CreateRunError, type CreateRunInput } from "@/lib/runs";
import { requireApiUser } from "@/lib/auth/guard";

// GET /api/runs?site=NUH  -> run history list for a site
export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const siteKey = request.nextUrl.searchParams.get("site");
  if (!siteKey) {
    return NextResponse.json({ error: "Missing ?site= query param" }, { status: 400 });
  }
  const runs = await listRunsForSite(siteKey);
  return NextResponse.json({ runs });
}

// POST /api/runs -> create a new run (all scenarios start as "notrun")
export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as CreateRunInput;
  try {
    const run = await createRun(body);
    return NextResponse.json({ run }, { status: 201 });
  } catch (err) {
    if (err instanceof CreateRunError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
