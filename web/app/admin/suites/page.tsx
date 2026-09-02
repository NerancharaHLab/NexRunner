import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteSuite, getSuiteUsageCounts, listSuites } from "@/lib/db/test-suites-table";
import { listScenariosForSite } from "@/lib/db/scenarios-table";
import { listSites } from "@/lib/db/sites-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION, type ScenarioDef } from "@/lib/types";
import SuitesList, { type SuiteRow } from "./SuitesList";

export default async function SuitesListPage() {
  await requireRole(CAN_EDIT_CONTENT);
  const suites = await listSuites();
  // includeInactive so a Suite still scoped to a since-deactivated Site resolves its badge/name
  // correctly instead of falling back to the raw id (same precedent as REQ-024's Edit Run form).
  const sites = await listSites({ includeInactive: true });
  const usageCounts = await getSuiteUsageCounts();

  const masterScenarios = await listScenariosForSite(MASTER_SCENARIO_PARTITION);
  const customBySiteEntries = await Promise.all(
    sites.map(async (site) => {
      const all = await listScenariosForSite(site.id);
      return [site.id, all.filter((sc) => sc.id.includes("-CUST-"))] as [string, ScenarioDef[]];
    })
  );
  const scenarioById = new Map<string, ScenarioDef>(
    [...masterScenarios, ...customBySiteEntries.flatMap(([, list]) => list)].map((sc) => [sc.id, sc])
  );

  const rows: SuiteRow[] = suites.map((suite) => {
    const resolved = suite.scenarioIds.map((id) => scenarioById.get(id)).filter((sc): sc is ScenarioDef => !!sc);
    const flowCounts: Record<ScenarioDef["flow"], number> = { OPD: 0, IPD: 0, General: 0 };
    for (const sc of resolved) flowCounts[sc.flow] += 1;
    const flowBreakdown = (["OPD", "IPD", "General"] as const)
      .filter((f) => flowCounts[f] > 0)
      .map((f) => `${f} ${flowCounts[f]}`)
      .join(" · ");
    const siteLabel = suite.siteId ? sites.find((s) => s.id === suite.siteId)?.name ?? suite.siteId : "Global";

    return {
      id: suite.id,
      name: suite.name,
      description: suite.description,
      siteId: suite.siteId ?? null,
      siteLabel,
      scenarioCount: resolved.length,
      criticalCount: resolved.filter((sc) => sc.critical).length,
      flowBreakdown,
      usageCount: usageCounts[suite.id] ?? 0,
    };
  });

  async function deleteSuiteAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const suiteId = String(formData.get("suiteId") || "");
    await deleteSuite(suiteId);
    redirect("/admin/suites");
  }

  return (
    <main className="container">
      <Link href="/admin/scenarios" className="breadcrumb" data-testid="smoke-runner:admin-suites:link__breadcrumb">
        ← Back to Manage Scenarios
      </Link>

      <div className="page-header">
        <div>
          <h1>Manage Suites</h1>
          <p className="subtitle">
            Group Master (and, for a site-scoped Suite, that site&apos;s own Custom) Scenarios into
            test Suites — select a Suite when starting a new Run to test only the Scenarios in
            that Suite.
          </p>
        </div>
        <Link href="/admin/suites/new" className="btn btn-primary" data-testid="smoke-runner:admin-suites:btn__new">
          + Add Suite
        </Link>
      </div>

      <SuitesList suites={rows} sites={sites.filter((s) => s.active)} deleteAction={deleteSuiteAction} />
    </main>
  );
}
