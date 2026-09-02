import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getScenariosForSite } from "@/lib/scenarios";
import { cloneScenario, listScenariosForSite } from "@/lib/db/scenarios-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION } from "@/lib/types";
import CloneFromMasterList from "./CloneFromMasterList";

interface PageProps {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ error?: string; source?: string }>;
}

export default async function CloneFromMasterPage({ params, searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { site } = await params;
  const { error, source } = await searchParams;

  const siteFile = await getScenariosForSite(site);
  if (!siteFile) notFound();

  const [allMasterScenarios, siteScenarios] = await Promise.all([
    listScenariosForSite(MASTER_SCENARIO_PARTITION),
    listScenariosForSite(site),
  ]);
  const existingIds = new Set(siteScenarios.map((s) => s.id));
  // REQ-036: distinct sourceSite values actually present, for the filter dropdown.
  const sourceOptions = [...new Set(allMasterScenarios.map((s) => s.sourceSite))].sort();
  const masterScenarios = source
    ? allMasterScenarios.filter((s) => s.sourceSite === source)
    : allMasterScenarios;

  async function cloneAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const selectedIds = masterScenarios
      .map((sc) => sc.id)
      .filter((id) => formData.get(`clone_${id}`) === "on");

    if (selectedIds.length === 0) {
      redirect(
        `/admin/scenarios/${site}/clone-from-master?error=${encodeURIComponent("Select at least 1 Scenario")}`
      );
    }

    for (const id of selectedIds) {
      await cloneScenario(MASTER_SCENARIO_PARTITION, site, id);
    }
    redirect(`/admin/scenarios/${site}`);
  }

  return (
    <main className="container">
      <Link href={`/admin/scenarios/${site}`} className="breadcrumb" data-testid="smoke-runner:clone-from-master:link__breadcrumb">
        ← Back to Scenario List
      </Link>

      <div className="page-header">
        <div>
          <h1>Clone from Master Library</h1>
          <p className="subtitle">To {siteFile.siteName}</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* REQ-036: plain GET form, no client component needed — reload with ?source= applied. */}
      {sourceOptions.length > 1 && (
        <form
          method="GET"
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
        >
          <label htmlFor="source" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Filter by Source Site
          </label>
          <select
            id="source"
            name="source"
            defaultValue={source ?? ""}
            data-testid="smoke-runner:clone-from-master:select__source-filter"
          >
            <option value="">All Sources</option>
            {sourceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-sm" data-testid="smoke-runner:clone-from-master:btn__apply-filter">
            Filter
          </button>
        </form>
      )}

      {masterScenarios.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          {allMasterScenarios.length === 0 ? (
            <>
              No Scenarios in the Master Library yet —{" "}
              <Link href="/admin/master-scenarios" data-testid="smoke-runner:clone-from-master:link__create-master-scenario">Add one in the Master Library first</Link>
            </>
          ) : (
            `No Scenarios from Source Site "${source}"`
          )}
        </div>
      ) : (
        <CloneFromMasterList
          scenarios={masterScenarios}
          existingIds={existingIds}
          sourceFilterActive={!!source}
          siteName={siteFile.siteName}
          cloneAction={cloneAction}
        />
      )}
    </main>
  );
}
