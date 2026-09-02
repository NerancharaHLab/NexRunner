import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteTag, getTagUsageCounts, listTags, TagInUseError } from "@/lib/db/tags-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";
import TagsTable from "./TagsTable";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function TagsAdminPage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { error } = await searchParams;
  const [tags, usageCounts] = await Promise.all([listTags(), getTagUsageCounts()]);
  const rows = tags.map((tag) => ({ ...tag, usageCount: usageCounts[tag.id] ?? 0 }));

  async function deleteTagAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const id = String(formData.get("id") || "");
    if (id) {
      try {
        await deleteTag(id);
      } catch (err) {
        if (err instanceof TagInUseError) {
          // The UI already blocks this (Delete is disabled once usage > 0), but a direct POST
          // must not be able to bypass the same guard — same defense-in-depth precedent as
          // createRun()'s inactive-site check.
          redirect(`/admin/tags?error=${encodeURIComponent(err.message)}`);
        }
        throw err;
      }
    }
    redirect("/admin/tags");
  }

  return (
    <main className="container">
      <Link href="/admin/scenarios" className="breadcrumb" data-testid="smoke-runner:admin-tags:link__breadcrumb">
        ← Back to Manage Scenarios
      </Link>

      <div className="page-header">
        <div>
          <h1>Manage Tags</h1>
          <p className="subtitle">Central Tag Catalog — attach to Master Scenarios, then filter when starting a Run</p>
        </div>
        <Link href="/admin/tags/new" className="btn btn-primary" data-testid="smoke-runner:admin-tags:link__new">
          + Add Tag
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {rows.length === 0 ? (
        <div className="empty-state">No Tags yet — go ahead and create the first one</div>
      ) : (
        <TagsTable tags={rows} deleteAction={deleteTagAction} />
      )}
    </main>
  );
}
