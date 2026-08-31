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
      redirect(`/admin/tags/new?error=${encodeURIComponent("ต้องระบุชื่อ Tag")}`);
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
        ← กลับไปรายการ Tag
      </Link>

      <div className="page-header">
        <div>
          <h1>เพิ่ม Tag ใหม่</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={createTagAction} className="card">
        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="name">ชื่อ Tag</label>
            <input
              id="name"
              name="name"
              placeholder="เช่น smoke, p1, regression"
              required
              data-testid="smoke-runner:admin-tag-form:input__name"
            />
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-tag-form:btn__save">
            บันทึก
          </button>
        </div>
      </form>
    </main>
  );
}
