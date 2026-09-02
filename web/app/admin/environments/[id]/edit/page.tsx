import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  deleteEnvironment,
  EnvironmentInUseError,
  getEnvironment,
  updateEnvironmentName,
} from "@/lib/db/environments-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditEnvironmentPage({ params, searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { id: rawId } = await params;
  const environmentId = decodeURIComponent(rawId);
  const { error } = await searchParams;

  const environment = await getEnvironment(environmentId);
  if (!environment) notFound();

  async function updateEnvironmentAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      redirect(
        `/admin/environments/${encodeURIComponent(environmentId)}/edit?error=${encodeURIComponent("Environment name is required")}`
      );
    }
    await updateEnvironmentName(environmentId, name);
    redirect("/admin/environments");
  }

  async function deleteEnvironmentAction() {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    try {
      await deleteEnvironment(environmentId);
    } catch (err) {
      if (err instanceof EnvironmentInUseError) {
        redirect(`/admin/environments/${encodeURIComponent(environmentId)}/edit?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect("/admin/environments");
  }

  return (
    <main className="container">
      <Link href="/admin/environments" className="breadcrumb" data-testid="smoke-runner:admin-environment-form:link__breadcrumb">
        ← Back to Environment List
      </Link>

      <div className="page-header">
        <div>
          <h1>Edit Environment</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={updateEnvironmentAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="name">Environment Name</label>
            <input
              id="name"
              name="name"
              defaultValue={environment.name}
              required
              data-testid="smoke-runner:admin-environment-form:input__name"
            />
          </div>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 12 }}>
          Renaming this does not change how already-created Runs display it — Run.environment
          copies the name at creation time, not a live reference.
        </p>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-environment-form:btn__save">
            Save
          </button>
        </div>
      </form>

      <form action={deleteEnvironmentAction} style={{ marginTop: 4 }}>
        <button type="submit" className="btn btn-danger-text" data-testid="smoke-runner:admin-environment-form:btn__delete">
          Delete this Environment
        </button>
      </form>
    </main>
  );
}
