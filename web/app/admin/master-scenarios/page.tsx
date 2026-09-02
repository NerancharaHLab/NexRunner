import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteScenario, listScenariosForSite } from "@/lib/db/scenarios-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ source?: string }>;
}

export default async function MasterScenariosListPage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { source } = await searchParams;
  const allScenarios = await listScenariosForSite(MASTER_SCENARIO_PARTITION);
  // REQ-036: distinct sourceSite values actually present, for the filter dropdown — grows
  // organically with the data, no separate list to keep in sync.
  const sourceOptions = [...new Set(allScenarios.map((s) => s.sourceSite))].sort();
  const scenarios = source ? allScenarios.filter((s) => s.sourceSite === source) : allScenarios;

  async function deleteScenarioAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const scenarioId = String(formData.get("scenarioId") || "");
    await deleteScenario(MASTER_SCENARIO_PARTITION, scenarioId);
    redirect("/admin/master-scenarios");
  }

  return (
    <main className="container">
      <Link href="/admin/scenarios" className="breadcrumb" data-testid="smoke-runner:admin-master-scenarios:link__breadcrumb">
        ← Back to Manage Scenarios
      </Link>

      <div className="page-header">
        <div>
          <h1>Master Scenario Library</h1>
          <p className="subtitle">
            Central Scenario templates — each hospital can clone from here for its own use. Editing
            here does not affect what has already been cloned, until it&apos;s re-cloned.
          </p>
        </div>
        <Link
          href="/admin/master-scenarios/new"
          className="btn btn-primary"
          data-testid="smoke-runner:admin-master-scenarios:btn__new"
        >
          + Add Scenario
        </Link>
      </div>

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
            data-testid="smoke-runner:admin-master-scenarios:select__source-filter"
          >
            <option value="">All Sources</option>
            {sourceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-sm" data-testid="smoke-runner:admin-master-scenarios:btn__apply-filter">
            Filter
          </button>
        </form>
      )}

      {scenarios.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          No Scenarios in the Master Library yet
        </div>
      )}

      {scenarios.map((sc) => (
        <div
          key={sc.id}
          className="card"
          data-testid={`smoke-runner:admin-master-scenarios:row__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{sc.id}</strong>
              {sc.critical && <span className="critical-badge">Critical Flow</span>}
              <span
                className="tag-pill"
                style={{ marginLeft: 8 }}
                data-testid={`smoke-runner:admin-master-scenarios:badge-source__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
              >
                {sc.sourceSite}
              </span>
              <div>{sc.name}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {sc.flow} · {sc.role}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href={`/admin/master-scenarios/${encodeURIComponent(sc.id)}/edit`}
                className="btn"
                data-testid={`smoke-runner:admin-master-scenarios:btn-edit__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
              >
                Edit
              </Link>
              <form action={deleteScenarioAction}>
                <input type="hidden" name="scenarioId" value={sc.id} />
                <button
                  type="submit"
                  className="btn btn-danger-text"
                  data-testid={`smoke-runner:admin-master-scenarios:btn-delete__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}
