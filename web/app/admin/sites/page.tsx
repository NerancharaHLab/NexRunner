import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteSite, listSites, SiteHasRunsError, updateSiteActive } from "@/lib/db/sites-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SitesAdminPage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { error } = await searchParams;
  const sites = await listSites({ includeInactive: true });

  async function toggleActiveAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const id = String(formData.get("id") || "");
    const nextActive = formData.get("nextActive") === "true";
    await updateSiteActive(id, nextActive);
    redirect("/admin/sites");
  }

  async function deleteSiteAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const id = String(formData.get("id") || "");
    try {
      await deleteSite(id);
    } catch (err) {
      if (err instanceof SiteHasRunsError) {
        redirect(`/admin/sites?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect("/admin/sites");
  }

  return (
    <main className="container">
      <Link href="/admin/scenarios" className="breadcrumb">
        ← Back to Manage Scenarios
      </Link>

      <div className="page-header">
        <div>
          <h1>Manage Sites</h1>
          <p className="subtitle">Hospitals / test sites — deactivate one to hide it from pickers without losing its history</p>
        </div>
        <Link href="/admin/sites/new" className="btn btn-primary" data-testid="smoke-runner:admin-sites:btn__new">
          + Add Site
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {sites.length === 0 ? (
        <div className="empty-state">No Sites yet</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className={s.active ? "" : "inactive-row"} data-testid={`smoke-runner:admin-sites:row__${s.id}`}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="site-mark">{s.id.slice(0, 2).toUpperCase()}</span>
                      <strong>{s.name}</strong>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <form action={toggleActiveAction} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="nextActive" value={(!s.active).toString()} />
                        <button
                          type="submit"
                          className={`toggle-switch ${s.active ? "on" : "off"}`}
                          aria-label={s.active ? "Deactivate" : "Activate"}
                          title={s.active ? "Deactivate" : "Activate"}
                          data-testid={`smoke-runner:admin-sites:btn-toggle-active__${s.id}`}
                        >
                          <span className="toggle-thumb" />
                        </button>
                      </form>
                      {!s.active && (
                        <span className="critical-badge" data-testid={`smoke-runner:admin-sites:badge-inactive__${s.id}`}>
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Link
                        href={`/admin/sites/${encodeURIComponent(s.id)}/edit`}
                        className="btn btn-sm"
                        data-testid={`smoke-runner:admin-sites:btn-edit__${s.id}`}
                      >
                        Edit
                      </Link>
                      <form action={deleteSiteAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="btn btn-sm btn-danger-text"
                          data-testid={`smoke-runner:admin-sites:btn-delete__${s.id}`}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
