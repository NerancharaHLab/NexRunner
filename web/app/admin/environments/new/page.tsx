import Link from "next/link";
import { redirect } from "next/navigation";
import { createEnvironment } from "@/lib/db/environments-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewEnvironmentPage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { error } = await searchParams;

  async function createEnvironmentAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      redirect(`/admin/environments/new?error=${encodeURIComponent("Environment name is required")}`);
    }
    await createEnvironment(name);
    redirect("/admin/environments");
  }

  return (
    <main className="container">
      <Link href="/admin/environments" className="breadcrumb" data-testid="smoke-runner:admin-environment-form:link__breadcrumb">
        ← Back to Environment List
      </Link>

      <div className="page-header">
        <div>
          <h1>Add New Environment</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={createEnvironmentAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="name">Environment Name</label>
            <input
              id="name"
              name="name"
              placeholder="e.g. STAGING"
              required
              data-testid="smoke-runner:admin-environment-form:input__name"
            />
          </div>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 12 }}>
          New Environments are added to the end of the picker order. Renaming one later does not
          change how already-created Runs display it.
        </p>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-environment-form:btn__save">
            Save
          </button>
        </div>
      </form>
    </main>
  );
}
