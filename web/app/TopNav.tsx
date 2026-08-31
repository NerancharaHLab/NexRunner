import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guard";
import { CAN_EDIT_CONTENT, hasAnyRole } from "@/lib/types";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import ManageMenu, { type ManageMenuLink } from "./ManageMenu";

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

  const manageLinks: ManageMenuLink[] = [];
  if (canEdit) {
    manageLinks.push(
      { href: "/admin/scenarios", label: "Manage Scenarios", testid: "smoke-runner:top-nav:link__admin-scenarios" },
      { href: "/admin/sites", label: "Manage Sites", testid: "smoke-runner:top-nav:link__admin-sites" }
    );
  }
  if (isAdmin) {
    manageLinks.push({ href: "/admin/users", label: "Manage Users", testid: "smoke-runner:top-nav:link__admin-users" });
  }

  return (
    <nav className="top-nav no-print">
      <Link href="/" className="top-nav-brand">
        <span className="top-nav-mark">ST</span>
        Smoke Test Runner
      </Link>
      <div className="top-nav-right">
        <ManageMenu links={manageLinks} />
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
          Change Password
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-sm" data-testid="smoke-runner:top-nav:btn__logout">
            Log Out
          </button>
        </form>
      </div>
    </nav>
  );
}
