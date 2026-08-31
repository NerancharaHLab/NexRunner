import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getUserByEmail, updateUserPassword } from "@/lib/azure/users-table";

interface PageProps {
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function ChangePasswordPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const { error, ok } = await searchParams;

  async function changePasswordAction(formData: FormData) {
    "use server";
    const current = String(formData.get("current") || "");
    const next = String(formData.get("next") || "");
    const confirm = String(formData.get("confirm") || "");

    const entity = await getUserByEmail(user.email);
    const validCurrent = entity ? await verifyPassword(current, entity.passwordHash) : false;
    if (!entity || !validCurrent) {
      redirect(`/change-password?error=${encodeURIComponent("รหัสผ่านปัจจุบันไม่ถูกต้อง")}`);
    }
    if (next.length < 8) {
      redirect(`/change-password?error=${encodeURIComponent("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร")}`);
    }
    if (next !== confirm) {
      redirect(`/change-password?error=${encodeURIComponent("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน")}`);
    }

    const passwordHash = await hashPassword(next);
    await updateUserPassword(user.email, passwordHash);
    redirect("/change-password?ok=1");
  }

  return (
    <main className="container-narrow">
      <div className="page-header">
        <div>
          <h1>เปลี่ยนรหัสผ่าน</h1>
          <p className="subtitle">{user.displayName}</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {ok && (
        <div className="stat-pill pass" style={{ marginBottom: 16 }}>
          เปลี่ยนรหัสผ่านสำเร็จ
        </div>
      )}

      <form action={changePasswordAction} className="card">
        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="current">รหัสผ่านปัจจุบัน</label>
            <input
              id="current"
              name="current"
              type="password"
              required
              autoComplete="current-password"
              data-testid="smoke-runner:change-password:input__current"
            />
          </div>
          <div>
            <label htmlFor="next">รหัสผ่านใหม่</label>
            <input
              id="next"
              name="next"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              data-testid="smoke-runner:change-password:input__next"
            />
          </div>
          <div>
            <label htmlFor="confirm">ยืนยันรหัสผ่านใหม่</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              data-testid="smoke-runner:change-password:input__confirm"
            />
          </div>
        </div>
        <div className="form-footer" style={{ justifyContent: "space-between" }}>
          <Link href="/" className="breadcrumb">
            ← กลับหน้าหลัก
          </Link>
          <button type="submit" className="btn btn-primary" data-testid="smoke-runner:change-password:btn__submit">
            บันทึกรหัสผ่านใหม่
          </button>
        </div>
      </form>
    </main>
  );
}
