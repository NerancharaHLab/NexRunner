import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/db/users-table";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { isActiveUser } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const user = await getUserByEmail(email);
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok) {
      redirect(`/login?error=${encodeURIComponent("Incorrect email or password")}`);
    }
    if (!isActiveUser(user)) {
      redirect(`/login?error=${encodeURIComponent("This account has been deactivated. Please contact an administrator.")}`);
    }

    const token = await createSessionToken({ email: user.rowKey });
    const store = await cookies();
    store.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    redirect("/");
  }

  return (
    <main className="container-narrow">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <span
          className="top-nav-mark"
          style={{ width: 44, height: 44, borderRadius: 12, fontSize: "1.1rem", margin: "0 auto 14px" }}
        >
          ST
        </span>
        <h1>Smoke Test Runner</h1>
        <p className="subtitle" style={{ marginTop: 6 }}>
          Log in to run your tests
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form action={loginAction} className="card">
        <div className="field-row" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              data-testid="smoke-runner:login:input__email"
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              data-testid="smoke-runner:login:input__password"
            />
          </div>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", marginTop: 18 }}
          data-testid="smoke-runner:login:btn__submit"
        >
          Log In
        </button>
      </form>

      <details className="forgot-password">
        <summary data-testid="smoke-runner:login:btn__forgot-password">ลืมรหัสผ่าน?</summary>
        <p data-testid="smoke-runner:login:text__forgot-password-info">
          ระบบยังไม่รองรับการรีเซ็ตรหัสผ่านอัตโนมัติ กรุณาติดต่อผู้ดูแลระบบที่{" "}
          <a href="mailto:neranchara.kae@hlabconsulting.com" data-testid="smoke-runner:login:link__contact-admin">
            neranchara.kae@hlabconsulting.com
          </a>
        </p>
      </details>
    </main>
  );
}
