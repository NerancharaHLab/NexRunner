import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteTag, listTags } from "@/lib/db/tags-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

export default async function TagsAdminPage() {
  await requireRole(CAN_EDIT_CONTENT);
  const tags = await listTags();

  async function deleteTagAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const id = String(formData.get("id") || "");
    if (id) await deleteTag(id);
    redirect("/admin/tags");
  }

  return (
    <main className="container">
      <Link href="/admin/scenarios" className="breadcrumb">
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

      {tags.length === 0 ? (
        <div className="empty-state">No Tags yet — go ahead and create the first one</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tag Name</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} data-testid={`smoke-runner:admin-tags:row__${tag.id}`}>
                  <td>{tag.name}</td>
                  <td style={{ textAlign: "right" }}>
                    <form action={deleteTagAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={tag.id} />
                      <button
                        type="submit"
                        className="btn-danger-text"
                        data-testid={`smoke-runner:admin-tags:btn-delete__${tag.id}`}
                      >
                        Delete
                      </button>
                    </form>
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
