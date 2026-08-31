import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, hasAnyRole } from "@/lib/types";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function TopNav() {
  const user = await getCurrentUser();
  if (!user) return null; // e.g. on /login itself, before a session cookie exists

  async function logoutAction() {
    "use server";
    const store = await cookies();
    store.delete(SESSION_COOKIE_NAME);
    redirect("/login");
  }

  const canEdit = hasAnyRole(user.roles, CAN_EDIT_CONTENT);
  const isAdmin = user.roles.includes("admin");
  const initial = user.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <nav className="top-nav no-print">
      <Link href="/" className="top-nav-brand">
        <span className="top-nav-mark">ST</span>
        Smoke Test Runner
      </Link>
      <div className="top-nav-right">
        {canEdit && (
          <div className="top-nav-links">
            <Link href="/admin/scenarios" data-testid="smoke-runner:top-nav:link__admin-scenarios">
              จัดการ Scenario
            </Link>
            {isAdmin && (
              <Link href="/admin/users" data-testid="smoke-runner:top-nav:link__admin-users">
                จัดการผู้ใช้
              </Link>
            )}
          </div>
        )}
        <div className="user-chip">
          <span className="avatar">{initial}</span>
          <span>
            {user.displayName}
            <br />
            <span className="user-role">{user.roles.join(", ")}</span>
          </span>
        </div>
        <Link
          href="/change-password"
          className="btn btn-sm"
          data-testid="smoke-runner:top-nav:link__change-password"
        >
          เปลี่ยนรหัสผ่าน
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-sm" data-testid="smoke-runner:top-nav:btn__logout">
            ออกจากระบบ
          </button>
        </form>
      </div>
    </nav>
  );
}
