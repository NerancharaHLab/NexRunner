import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteEnvironment,
  EnvironmentInUseError,
  listEnvironments,
  updateEnvironmentActive,
} from "@/lib/db/environments-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function EnvironmentsAdminPage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { error } = await searchParams;
  const environments = await listEnvironments({ includeInactive: true });

  async function toggleActiveAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const id = String(formData.get("id") || "");
    const nextActive = formData.get("nextActive") === "true";
    await updateEnvironmentActive(id, nextActive);
    redirect("/admin/environments");
  }

  async function deleteEnvironmentAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const id = String(formData.get("id") || "");
    try {
      await deleteEnvironment(id);
    } catch (err) {
      if (err instanceof EnvironmentInUseError) {
        redirect(`/admin/environments?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect("/admin/environments");
  }

  return (
    <main className="container">
      <Link href="/admin/scenarios" className="breadcrumb" data-testid="smoke-runner:admin-environments:link__breadcrumb">
        ← Back to Manage Scenarios
      </Link>

      <div className="page-header">
        <div>
          <h1>Manage Environments</h1>
          <p className="subtitle">Environment picker options for New Run / Run Edit — deactivate one to hide it from pickers without losing Run history</p>
        </div>
        <Link href="/admin/environments/new" className="btn btn-primary" data-testid="smoke-runner:admin-environments:btn__new">
          + Add Environment
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {environments.length === 0 ? (
        <div className="empty-state">No Environments yet</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Environment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {environments.map((e) => (
                <tr key={e.id} className={e.active ? "" : "inactive-row"} data-testid={`smoke-runner:admin-environments:row__${e.id}`}>
                  <td>
                    <strong>{e.name}</strong>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <form action={toggleActiveAction} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="nextActive" value={(!e.active).toString()} />
                        <button
                          type="submit"
                          className={`toggle-switch ${e.active ? "on" : "off"}`}
                          aria-label={e.active ? "Deactivate" : "Activate"}
                          title={e.active ? "Deactivate" : "Activate"}
                          data-testid={`smoke-runner:admin-environments:btn-toggle-active__${e.id}`}
                        >
                          <span className="toggle-thumb" />
                        </button>
                      </form>
                      {!e.active && (
                        <span className="critical-badge" data-testid={`smoke-runner:admin-environments:badge-inactive__${e.id}`}>
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Link
                        href={`/admin/environments/${encodeURIComponent(e.id)}/edit`}
                        className="btn btn-sm"
                        data-testid={`smoke-runner:admin-environments:btn-edit__${e.id}`}
                      >
                        Edit
                      </Link>
                      <form action={deleteEnvironmentAction}>
                        <input type="hidden" name="id" value={e.id} />
                        <button
                          type="submit"
                          className="btn btn-sm btn-danger-text"
                          data-testid={`smoke-runner:admin-environments:btn-delete__${e.id}`}
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
