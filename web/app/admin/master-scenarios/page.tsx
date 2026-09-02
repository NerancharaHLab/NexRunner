import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteScenario, listScenariosForSite } from "@/lib/db/scenarios-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION } from "@/lib/types";
import ScenarioImportModal from "@/app/admin/ScenarioImportModal";
import MasterScenarioLibraryList from "./MasterScenarioLibraryList";

interface PageProps {
  searchParams: Promise<{ source?: string; imported?: string; firstId?: string; lastId?: string }>;
}

export default async function MasterScenariosListPage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { source, imported, firstId, lastId } = await searchParams;
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
        <div style={{ display: "flex", gap: 8 }}>
          <ScenarioImportModal
            target={{ kind: "master" }}
            returnPath="/admin/master-scenarios"
            triggerTestId="smoke-runner:admin-master-scenarios:btn__import-csv"
          />
          <Link
            href="/admin/master-scenarios/new"
            className="btn btn-primary"
            data-testid="smoke-runner:admin-master-scenarios:btn__new"
          >
            + Add Scenario
          </Link>
        </div>
      </div>

      {imported && (
        <div className="success-banner" data-testid="smoke-runner:admin-master-scenarios:banner__import-success">
          ✅ Imported {imported} scenario{imported === "1" ? "" : "s"}
          {firstId && lastId && (firstId === lastId ? ` (${firstId})` : ` (${firstId} – ${lastId})`)}
        </div>
      )}

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

      <MasterScenarioLibraryList
        scenarios={scenarios}
        sourceFilterActive={!!source}
        deleteScenarioAction={deleteScenarioAction}
      />
    </main>
  );
}
