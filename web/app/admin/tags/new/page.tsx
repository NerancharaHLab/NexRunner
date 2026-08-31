import Link from "next/link";
import { redirect } from "next/navigation";
import { createTag, TagAlreadyExistsError } from "@/lib/azure/tags-table";
import { requireRole } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewTagPage({ searchParams }: PageProps) {
  await requireRole(CAN_EDIT_CONTENT);
  const { error } = await searchParams;

  async function createTagAction(formData: FormData) {
    "use server";
    await requireRole(CAN_EDIT_CONTENT);
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      redirect(`/admin/tags/new?error=${encodeURIComponent("Tag name is required")}`);
    }
    try {
      await createTag(name);
    } catch (err) {
      if (err instanceof TagAlreadyExistsError) {
        redirect(`/admin/tags/new?error=${encodeURIComponent(err.message)}`);
      }
      throw err;
    }
    redirect("/admin/tags");
  }

  return (
    <main className="container">
      <Link href="/admin/tags" className="breadcrumb">
        ← Back to Tag List
      </Link>

      <div className="page-header">
        <div>
          <h1>Add New Tag</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={createTagAction} className="card">
        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="name">Tag Name</label>
            <input
              id="name"
              name="name"
              placeholder="e.g. smoke, p1, regression"
              required
              data-testid="smoke-runner:admin-tag-form:input__name"
            />
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-tag-form:btn__save">
            Save
          </button>
        </div>
      </form>
    </main>
  );
}
