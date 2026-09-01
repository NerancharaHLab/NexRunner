import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteSite, getSite, SiteHasRunsError, updateSiteName } from "@/lib/db/sites-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditSitePage({ params, searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { id: rawId } = await params;
  const siteId = decodeURIComponent(rawId);
  const { error } = await searchParams;

  const site = await getSite(siteId);
  if (!site) notFound();

  async function updateSiteAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      redirect(`/admin/sites/${encodeURIComponent(siteId)}/edit?error=${encodeURIComponent("Site name is required")}`);
    }
    await updateSiteName(siteId, name);
    redirect("/admin/sites");
  }

  async function deleteSiteAction() {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    try {
      await deleteSite(siteId);
    } catch (err) {
      if (err instanceof SiteHasRunsError) {
        redirect(`/admin/sites/${encodeURIComponent(siteId)}/edit?error=${encodeURIComponent(err.message)}`);
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
          <h1>Edit Site</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={updateSiteAction} className="card">
        <div className="field-row">
          <div>
            <label htmlFor="id">Site ID</label>
            {/* Locked — the id is the partition key for this site's Scenarios/Runs, changing it
                would silently orphan existing data (see azure/sites-table.ts). */}
            <div id="id" className="field-static-value" data-testid="smoke-runner:admin-site-form:input__id">
              {site.id}
            </div>
          </div>
          <div>
            <label htmlFor="name">Site Name</label>
            <input
              id="name"
              name="name"
              defaultValue={site.name}
              required
              data-testid="smoke-runner:admin-site-form:input__name"
            />
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-site-form:btn__save">
            Save
          </button>
        </div>
      </form>

      <form action={deleteSiteAction} style={{ marginTop: 4 }}>
        <button type="submit" className="btn btn-danger-text" data-testid="smoke-runner:admin-site-form:btn__delete">
          Delete this Site
        </button>
      </form>
    </main>
  );
}
