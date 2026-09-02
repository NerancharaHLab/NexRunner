import Link from "next/link";
import { redirect } from "next/navigation";
import { listScenariosForSite } from "@/lib/db/scenarios-table";
import { listSites } from "@/lib/db/sites-table";
import { createSuite } from "@/lib/db/test-suites-table";
import { nextSuiteId } from "@/lib/db/id-sequence";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION, type ScenarioDef } from "@/lib/types";
import SuiteScenarioPicker from "@/app/admin/suites/SuiteScenarioPicker";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewSuitePage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { error } = await searchParams;
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

  async function createSuiteAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      redirect(`/admin/suites/new?error=${encodeURIComponent("Suite name is required")}`);
    }
    // System-generated (REQ-032) — never accepted from the client.
    const id = await nextSuiteId();
    const siteId = String(formData.get("siteId") || "").trim() || null;
    // Re-derive the valid pool for the *submitted* siteId server-side (never trust that the
    // submitted sc_* fields actually match the picker's own Target Site filtering client-side) —
    // Master is always eligible, that site's own Custom Scenarios only if a real site was chosen.
    const validIds = new Set([
      ...masterScenarios.map((sc) => sc.id),
      ...(siteId ? customScenariosBySite[siteId] ?? [] : []).map((sc) => sc.id),
    ]);
    const scenarioIds = [...validIds].filter((scId) => formData.get(`sc_${scId}`) === "on");
    await createSuite({
      id,
      name,
      description: String(formData.get("description") || ""),
      scenarioIds,
      siteId,
    });
    redirect("/admin/suites");
  }

  return (
    <main className="container">
      <Link href="/admin/suites" className="breadcrumb" data-testid="smoke-runner:admin-suite-form:link__breadcrumb">
        ← Back to Suite List
      </Link>

      <div className="page-header">
        <div>
          <h1>Add New Suite</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {masterScenarios.length === 0 && (
        <div className="error-banner">
          No Scenarios in the Master Library yet —{" "}
          <Link href="/admin/master-scenarios" data-testid="smoke-runner:admin-suite-form:link__create-master-scenario">Add one in the Master Library first</Link>
        </div>
      )}

      <form action={createSuiteAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="name">Suite Name</label>
            <input id="name" name="name" placeholder="e.g. Smoke — OPD Critical Path" required data-testid="smoke-runner:admin-suite-form:input__name" />
          </div>
        </div>

        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="description">Description</label>
            <input id="description" name="description" data-testid="smoke-runner:admin-suite-form:input__description" />
          </div>
        </div>

        <SuiteScenarioPicker
          masterScenarios={masterScenarios}
          customScenariosBySite={customScenariosBySite}
          sites={sites}
        />

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-suite-form:btn__save">
            Save
          </button>
        </div>
      </form>
    </main>
  );
}
