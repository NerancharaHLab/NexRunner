import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import {
  createUser,
  deleteUser,
  getUserByEmail,
  listUsers,
  updateUserActive,
  updateUserRoles,
} from "@/lib/azure/users-table";
import { ALL_ROLES, isActiveUser, parseRoles } from "@/lib/types";

export default async function UsersAdminPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ error?: string }>;
}) {
  const currentUser = await requireRole(["admin"]);
  const { error } = await searchParams;
  const users = await listUsers();

  async function createUserAction(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const displayName = String(formData.get("displayName") || "");
    const roles = ALL_ROLES.filter((r) => formData.get(`role_${r}`) === "on");

    if (!email || !password || !displayName || roles.length === 0) {
      redirect(`/admin/users?error=${encodeURIComponent("กรอกข้อมูลให้ครบ และเลือกอย่างน้อย 1 Role")}`);
    }
    if (await getUserByEmail(email)) {
      redirect(`/admin/users?error=${encodeURIComponent(`มี User อีเมล ${email} อยู่แล้ว`)}`);
    }

    const passwordHash = await hashPassword(password);
    await createUser({ email, passwordHash, displayName, roles });
    redirect("/admin/users");
  }

  async function updateRolesAction(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const email = String(formData.get("email") || "");
    const roles = ALL_ROLES.filter((r) => formData.get(`role_${r}`) === "on");
    if (roles.length === 0) {
      redirect(`/admin/users?error=${encodeURIComponent("ต้องเลือกอย่างน้อย 1 Role")}`);
    }
    await updateUserRoles(email, roles);
    redirect("/admin/users");
  }

  async function toggleActiveAction(formData: FormData) {
    "use server";
    const actingUser = await requireRole(["admin"]);
    const email = String(formData.get("email") || "");
    const nextActive = formData.get("nextActive") === "true";
    if (email === actingUser.email) {
      redirect(`/admin/users?error=${encodeURIComponent("ปิดใช้งานบัญชีตัวเองไม่ได้")}`);
    }
    await updateUserActive(email, nextActive);
    redirect("/admin/users");
  }

  async function deleteUserAction(formData: FormData) {
    "use server";
    const actingUser = await requireRole(["admin"]);
    const email = String(formData.get("email") || "");
    if (email === actingUser.email) {
      redirect(`/admin/users?error=${encodeURIComponent("ลบบัญชีตัวเองไม่ได้")}`);
    }
    await deleteUser(email);
    redirect("/admin/users");
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>จัดการผู้ใช้</h1>
          <p className="subtitle">Users</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="section-label">เพิ่มผู้ใช้ใหม่</div>
        <form action={createUserAction}>
          <div className="field-row">
            <div>
              <label htmlFor="displayName">ชื่อที่แสดง</label>
              <input id="displayName" name="displayName" required data-testid="smoke-runner:admin-users:input__display-name" />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required data-testid="smoke-runner:admin-users:input__email" />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required data-testid="smoke-runner:admin-users:input__password" />
            </div>
          </div>
          <div className="section-label">Roles (เลือกได้มากกว่า 1)</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {ALL_ROLES.map((r) => (
              <label key={r} className="checkbox-row" htmlFor={`role_${r}`}>
                <input
                  type="checkbox"
                  id={`role_${r}`}
                  name={`role_${r}`}
                  defaultChecked={r === "qa_engineer"}
                  data-testid={`smoke-runner:admin-users:chk-role__${r}`}
                />
                {r}
              </label>
            ))}
          </div>
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" data-testid="smoke-runner:admin-users:btn__create">
              เพิ่มผู้ใช้
            </button>
          </div>
        </form>
      </div>

      <div className="section-label">รายชื่อผู้ใช้</div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ผู้ใช้</th>
              <th>Roles</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const roles = parseRoles(u);
              const active = isActiveUser(u);
              const isSelf = u.rowKey === currentUser.email;
              return (
                <tr
                  key={u.rowKey}
                  className={active ? "" : "inactive-row"}
                  data-testid={`smoke-runner:admin-users:row__${u.rowKey}`}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="avatar">{u.displayName.trim().charAt(0).toUpperCase() || "?"}</span>
                      <div>
                        <strong>{u.displayName}</strong>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{u.rowKey}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <form action={updateRolesAction} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input type="hidden" name="email" value={u.rowKey} />
                      {ALL_ROLES.map((r) => (
                        <label key={r} className="checkbox-row" style={{ margin: 0 }} htmlFor={`${u.rowKey}_role_${r}`}>
                          <input
                            type="checkbox"
                            id={`${u.rowKey}_role_${r}`}
                            name={`role_${r}`}
                            defaultChecked={roles.includes(r)}
                            data-testid={`smoke-runner:admin-users:chk-role-row__${u.rowKey}__${r}`}
                          />
                          {r}
                        </label>
                      ))}
                      <button type="submit" className="btn btn-sm" data-testid={`smoke-runner:admin-users:btn-update-role__${u.rowKey}`}>
                        อัปเดต
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={toggleActiveAction} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="hidden" name="email" value={u.rowKey} />
                      <input type="hidden" name="nextActive" value={(!active).toString()} />
                      <button
                        type="submit"
                        className={`toggle-switch ${active ? "on" : "off"}`}
                        disabled={isSelf}
                        aria-label={active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        title={active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        data-testid={`smoke-runner:admin-users:btn-toggle-active__${u.rowKey}`}
                      >
                        <span className="toggle-thumb" />
                      </button>
                      {!active && (
                        <span
                          className="critical-badge"
                          data-testid={`smoke-runner:admin-users:badge-inactive__${u.rowKey}`}
                        >
                          ปิดใช้งาน
                        </span>
                      )}
                    </form>
                  </td>
                  <td>
                    <form action={deleteUserAction}>
                      <input type="hidden" name="email" value={u.rowKey} />
                      <button
                        type="submit"
                        className="btn btn-sm btn-danger-text"
                        disabled={isSelf}
                        data-testid={`smoke-runner:admin-users:btn-delete__${u.rowKey}`}
                      >
                        ลบ
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
