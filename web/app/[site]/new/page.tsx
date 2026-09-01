import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getScenariosForSite } from "@/lib/scenarios";
import { getSite } from "@/lib/db/sites-table";
import { listSuites } from "@/lib/db/test-suites-table";
import { listTags } from "@/lib/db/tags-table";
import { ENVIRONMENTS } from "@/lib/config";
import { createRun, CreateRunError, suggestNextRunId } from "@/lib/runs";
import { requireUser } from "@/lib/auth/guard";
import FilterPicker from "./FilterPicker";

interface PageProps {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function NewRunPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const { site } = await params;
  const { error } = await searchParams;
  const siteFile = await getScenariosForSite(site);
  if (!siteFile) notFound();

  // An inactive site is still reachable by direct URL (Run History/Run Detail/Reports all still
  // work), but starting a *new* Run here is blocked — show a blocking message instead of the form.
  // lib/runs.ts's createRun() backs this up server-side too, in case this page gets bypassed.
  const siteEntry = await getSite(site);
  if (siteEntry && !siteEntry.active) {
    return (
      <main className="container">
        <Link href={`/${site}`} className="breadcrumb">
          ← Back to Run List
        </Link>
        <div className="page-header">
          <div>
            <h1>Start New Test Run</h1>
            <p className="subtitle">{siteFile.siteName}</p>
          </div>
        </div>
        <div className="error-banner">
          This site is inactive. Reactivate it in Manage Sites to start a new Run.
        </div>
      </main>
    );
  }

  const suggestedRunId = await suggestNextRunId(site);
  const today = new Date().toISOString().slice(0, 10);
  const suites = await listSuites();
  const tags = await listTags();

  async function startRun(formData: FormData) {
    "use server";
    let run;
    try {
      run = await createRun({
        siteKey: site,
        runId: String(formData.get("runId") || ""),
        environment: String(formData.get("environment") || "STAGING"),
        testCycle: String(formData.get("testCycle") || "Cycle 1"),
        executedDate: String(formData.get("executedDate") || ""),
        // Never trust a client-submitted tester name — always the logged-in
        // user, even if the form field were tampered with (see the "lock
        // Tester" request; the input below is display-only, not editable).
        tester: user.displayName,
        version: String(formData.get("version") || ""),
        deliveryBatch: String(formData.get("deliveryBatch") || ""),
        hn: String(formData.get("hn") || ""),
        vn: String(formData.get("vn") || ""),
        an: String(formData.get("an") || ""),
        bill: String(formData.get("bill") || ""),
        suiteIds: suites.map((s) => s.id).filter((id) => formData.get(`suite_${id}`) === "on"),
        tagIncludeIds: tags.map((t) => t.id).filter((id) => formData.get(`tag_include_${id}`) === "on"),
        tagIncludeMode: formData.get("tagIncludeMode") === "AND" ? "AND" : "OR",
        tagExcludeIds: tags.map((t) => t.id).filter((id) => formData.get(`tag_exclude_${id}`) === "on"),
      });
    } catch (err) {
      if (err instanceof CreateRunError) {
        redirect(`/${site}/new?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect(`/${site}/${run.rowKey}`);
  }

  return (
    <main className="container">
      <Link href={`/${site}`} className="breadcrumb">
        ← Back to Run List
      </Link>

      <div className="page-header">
        <div>
          <h1>Start New Test Run</h1>
          <p className="subtitle">{siteFile.siteName}</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={startRun} className="card">
        <div className="new-run-columns">
          <div className="new-run-col-left">
            <div className="section-label">Test Run Info</div>
            <div className="field-row">
              <div>
                <label htmlFor="runId">Run ID</label>
                <input
                  id="runId"
                  name="runId"
                  defaultValue={suggestedRunId}
                  required
                  data-testid="smoke-runner:new-run:input__run-id"
                />
              </div>
              <div>
                <label htmlFor="environment">Environment</label>
                <select
                  id="environment"
                  name="environment"
                  defaultValue="STAGING"
                  data-testid="smoke-runner:new-run:select__environment"
                >
                  {ENVIRONMENTS.map((env) => (
                    <option key={env} value={env}>
                      {env}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="testCycle">Test Cycle</label>
                <input
                  id="testCycle"
                  name="testCycle"
                  defaultValue="Cycle 1"
                  data-testid="smoke-runner:new-run:input__test-cycle"
                />
              </div>
              <div>
                <label htmlFor="executedDate">Date Executed</label>
                <input
                  id="executedDate"
                  name="executedDate"
                  type="date"
                  defaultValue={today}
                  data-testid="smoke-runner:new-run:input__executed-date"
                />
              </div>
              <div>
                <label htmlFor="tester">Tester Name</label>
                {/* Locked to the logged-in user — not an <input>, so it can't be
                    changed client-side either (see startRun above for the
                    server-side enforcement). */}
                <div
                  id="tester"
                  className="field-static-value"
                  data-testid="smoke-runner:new-run:input__tester"
                >
                  {user.displayName}
                </div>
              </div>
              <div>
                <label htmlFor="version">System Version</label>
                <input
                  id="version"
                  name="version"
                  placeholder="v1.0.0"
                  data-testid="smoke-runner:new-run:input__version"
                />
              </div>
              <div>
                <label htmlFor="deliveryBatch">Delivery Batch</label>
                <input
                  id="deliveryBatch"
                  name="deliveryBatch"
                  placeholder="D 1"
                  data-testid="smoke-runner:new-run:input__delivery-batch"
                />
              </div>
            </div>

            <div className="section-label">Data Chain Tracker</div>
            <div className="field-row">
              <div>
                <label htmlFor="hn">Primary HN</label>
                <input id="hn" name="hn" data-testid="smoke-runner:new-run:input__hn" />
              </div>
              <div>
                <label htmlFor="vn">Primary VN</label>
                <input id="vn" name="vn" data-testid="smoke-runner:new-run:input__vn" />
              </div>
              <div>
                <label htmlFor="an">Primary AN</label>
                <input id="an" name="an" data-testid="smoke-runner:new-run:input__an" />
              </div>
              <div>
                <label htmlFor="bill">Bill No. / INV</label>
                <input id="bill" name="bill" data-testid="smoke-runner:new-run:input__bill" />
              </div>
            </div>
          </div>

          <div className="new-run-col-right">
            <div className="section-label">Scope (optional — leave empty to test every Scenario for this site)</div>
            <FilterPicker
              suites={suites.map((s) => ({ id: s.id, name: s.name, description: s.description }))}
              tags={tags}
            />
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:new-run:btn__start">
            Start Test Run
          </button>
        </div>
      </form>
    </main>
  );
}
