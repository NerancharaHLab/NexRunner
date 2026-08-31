import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getScenariosForSite } from "@/lib/scenarios";
import { cloneScenario, listScenariosForSite } from "@/lib/azure/scenarios-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, MASTER_SCENARIO_PARTITION } from "@/lib/types";

interface PageProps {
  params: Promise<{ site: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function CloneFromMasterPage({ params, searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { site } = await params;
  const { error } = await searchParams;

  const siteFile = await getScenariosForSite(site);
  if (!siteFile) notFound();

  const [masterScenarios, siteScenarios] = await Promise.all([
    listScenariosForSite(MASTER_SCENARIO_PARTITION),
    listScenariosForSite(site),
  ]);
  const existingIds = new Set(siteScenarios.map((s) => s.id));

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
      <Link href={`/admin/scenarios/${site}`} className="breadcrumb">
        ← Back to Scenario List
      </Link>

      <div className="page-header">
        <div>
          <h1>Clone from Master Library</h1>
          <p className="subtitle">To {siteFile.siteName}</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {masterScenarios.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          No Scenarios in the Master Library yet —{" "}
          <Link href="/admin/master-scenarios">Add one in the Master Library first</Link>
        </div>
      ) : (
        <form action={cloneAction} className="card">
          {masterScenarios.map((sc) => {
            const alreadyExists = existingIds.has(sc.id);
            return (
              <label
                key={sc.id}
                className="checkbox-row"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  width: "100%",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
                htmlFor={`clone_${sc.id}`}
              >
                <input
                  type="checkbox"
                  id={`clone_${sc.id}`}
                  name={`clone_${sc.id}`}
                  data-testid={`smoke-runner:clone-from-master:chk__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
                />
                <div>
                  <div>
                    <strong>{sc.id}</strong>
                    {sc.critical && <span className="critical-badge">Critical Flow</span>}
                    {alreadyExists && (
                      <span className="stat-pill block" style={{ marginLeft: 8 }}>
                        Already exists — will overwrite
                      </span>
                    )}
                  </div>
                  <div>{sc.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {sc.flow} · {sc.role}
                  </div>
                </div>
              </label>
            );
          })}
          <div className="form-footer">
            <button
              type="submit"
              className="btn btn-primary"
              data-testid="smoke-runner:clone-from-master:btn__clone"
            >
              Clone to {siteFile.siteName}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
