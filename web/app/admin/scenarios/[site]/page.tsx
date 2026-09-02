import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getScenariosForSite } from "@/lib/scenarios";
import { deleteScenario } from "@/lib/db/scenarios-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  params: Promise<{ site: string }>;
}

export default async function ScenariosAdminListPage({ params }: PageProps) {
  const { site } = await params;
  const siteFile = await getScenariosForSite(site);
  if (!siteFile) notFound();

  async function deleteScenarioAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const scenarioId = String(formData.get("scenarioId") || "");
    await deleteScenario(site, scenarioId);
    redirect(`/admin/scenarios/${site}`);
  }

  return (
    <main className="container">
      <Link href="/admin/scenarios" className="breadcrumb" data-testid="smoke-runner:admin-scenarios:link__breadcrumb">
        ← Choose Another Hospital
      </Link>

      <div className="page-header">
        <div>
          <h1>Manage Scenarios</h1>
          <p className="subtitle">{siteFile.siteName}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href={`/admin/scenarios/${site}/clone-from-master`}
            className="btn"
            data-testid={`smoke-runner:admin-scenarios:link__clone-from-master__${site}`}
          >
            Clone from Master Library →
          </Link>
          <Link
            href={`/admin/scenarios/${site}/new`}
            className="btn btn-primary"
            data-testid="smoke-runner:admin-scenarios:btn__new"
          >
            + Add Scenario
          </Link>
        </div>
      </div>

      {siteFile.scenarios.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">—</div>
          No Scenarios for this site yet
        </div>
      )}

      {siteFile.scenarios.map((sc) => (
        <div
          key={sc.id}
          className="card"
          data-testid={`smoke-runner:admin-scenarios:row__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{sc.id}</strong>
              {sc.critical && <span className="critical-badge">Critical Flow</span>}
              <div>{sc.name}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {sc.flow} · {sc.role}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link
                href={`/admin/scenarios/${site}/${encodeURIComponent(sc.id)}/edit`}
                className="btn"
                data-testid={`smoke-runner:admin-scenarios:btn-edit__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
              >
                Edit
              </Link>
              <form action={deleteScenarioAction}>
                <input type="hidden" name="scenarioId" value={sc.id} />
                <button
                  type="submit"
                  className="btn btn-danger-text"
                  data-testid={`smoke-runner:admin-scenarios:btn-delete__${sc.id.replace(/[^a-zA-Z0-9]/g, "")}`}
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
