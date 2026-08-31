import Link from "next/link";
import { redirect } from "next/navigation";
import { createSite, SiteAlreadyExistsError } from "@/lib/azure/sites-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewSitePage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { error } = await searchParams;

  async function createSiteAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const id = String(formData.get("id") || "").trim();
    const name = String(formData.get("name") || "").trim();
    if (!id || !name) {
      redirect(`/admin/sites/new?error=${encodeURIComponent("Site ID and Site name are required")}`);
    }
    try {
      await createSite(id, name);
    } catch (err) {
      if (err instanceof SiteAlreadyExistsError) {
        redirect(`/admin/sites/new?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect("/admin/sites");
  }

  return (
    <main className="container">
      <Link href="/admin/sites" className="breadcrumb">
        ← Back to Site List
      </Link>

      <div className="page-header">
        <div>
          <h1>Add New Site</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={createSiteAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="id">Site ID</label>
            <input
              id="id"
              name="id"
              placeholder="e.g. NUH"
              required
              data-testid="smoke-runner:admin-site-form:input__id"
            />
          </div>
          <div>
            <label htmlFor="name">Site Name</label>
            <input
              id="name"
              name="name"
              placeholder="e.g. NUH (Naresuan University Hospital)"
              required
              data-testid="smoke-runner:admin-site-form:input__name"
            />
          </div>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 12 }}>
          The Site ID cannot be changed after creation — it&apos;s used as the key for every
          Scenario/Run recorded under this site.
        </p>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-site-form:btn__save">
            Save
          </button>
        </div>
      </form>
    </main>
  );
}
