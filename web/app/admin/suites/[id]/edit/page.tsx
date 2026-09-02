import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listScenariosForSite } from "@/lib/db/scenarios-table";
import { listSites } from "@/lib/db/sites-table";
import { deleteSuite, getSuite, updateSuite } from "@/lib/db/test-suites-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION, type ScenarioDef } from "@/lib/types";
import SuiteScenarioPicker from "@/app/admin/suites/SuiteScenarioPicker";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditSuitePage({ params, searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { id: rawId } = await params;
  const suiteId = decodeURIComponent(rawId);
  const { error } = await searchParams;

  const suite = await getSuite(suiteId);
  if (!suite) notFound();
  const masterScenarios = await listScenariosForSite(MASTER_SCENARIO_PARTITION);
  const sites = await listSites();
  // REQ-039: each site's own Custom Scenarios only — never its cloned-from-Master duplicates,
  // which keep the Master's own MST- id (see SuiteScenarioPicker.tsx's scopeLabelFor comment).
  const customBySiteEntries = await Promise.all(
    sites.map(async (site) => {
      const all = await listScenariosForSite(site.id);
      const custom = all.filter((sc) => sc.id.includes("-CUST-"));
      return [site.id, custom] as [string, ScenarioDef[]];
    })
  );
  const customScenariosBySite = Object.fromEntries(customBySiteEntries);

  async function updateSuiteAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      redirect(
        `/admin/suites/${encodeURIComponent(suiteId)}/edit?error=${encodeURIComponent("Suite name is required")}`
      );
    }
    const siteId = String(formData.get("siteId") || "").trim() || null;
    // Re-derive the valid pool for the *submitted* siteId server-side — same reasoning as
    // new/page.tsx's createSuiteAction.
    const validIds = new Set([
      ...masterScenarios.map((sc) => sc.id),
      ...(siteId ? customScenariosBySite[siteId] ?? [] : []).map((sc) => sc.id),
    ]);
    const scenarioIds = [...validIds].filter((scId) => formData.get(`sc_${scId}`) === "on");
    // id is system-generated and immutable (REQ-032) — never read from the form, always the
    // existing id from the route param, so even a bypassed/tampered request can't rename it.
    await updateSuite(suiteId, {
      id: suiteId,
      name,
      description: String(formData.get("description") || ""),
      scenarioIds,
      siteId,
    });
    redirect("/admin/suites");
  }

  async function deleteSuiteAction() {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    await deleteSuite(suiteId);
    redirect("/admin/suites");
  }

  return (
    <main className="container">
      <Link href="/admin/suites" className="breadcrumb" data-testid="smoke-runner:admin-suite-form:link__breadcrumb">
        ← Back to Suite List
      </Link>

      <div className="page-header">
        <div>
          <h1>Edit Suite</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={updateSuiteAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="id">Suite ID</label>
            {/* System-generated, immutable (REQ-032) — read-only display, not an editable <input>,
                so it can't be changed client-side either (see updateSuiteAction above for the
                server-side enforcement). */}
            <div id="id" className="field-static-value" data-testid="smoke-runner:admin-suite-form:input__id">
              {suite.id}
            </div>
          </div>
          <div>
            <label htmlFor="name">Suite Name</label>
            <input id="name" name="name" defaultValue={suite.name} required data-testid="smoke-runner:admin-suite-form:input__name" />
          </div>
        </div>

        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="description">Description</label>
            <input id="description" name="description" defaultValue={suite.description} data-testid="smoke-runner:admin-suite-form:input__description" />
          </div>
        </div>

        <SuiteScenarioPicker
          masterScenarios={masterScenarios}
          customScenariosBySite={customScenariosBySite}
          sites={sites}
          initialSiteId={suite.siteId}
          initialScenarioIds={suite.scenarioIds}
        />

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-suite-form:btn__save">
            Save
          </button>
        </div>
      </form>

      <form action={deleteSuiteAction} style={{ marginTop: 4 }}>
        <button type="submit" className="btn btn-danger-text" data-testid="smoke-runner:admin-suite-form:btn__delete">
          Delete this Suite
        </button>
      </form>
    </main>
  );
}
