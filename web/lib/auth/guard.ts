import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db/users-table";
import { hasAnyRole, isActiveUser, parseRoles, type Role, type SessionUser } from "@/lib/types";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

/** Verifies the session cookie for identity, then reads the user fresh from
 *  the Users table on every call — role changes and deactivation take effect
 *  immediately this way, instead of only on the next login (see
 *  session.ts's SessionTokenPayload doc comment). */
export async function getCurrentUser(): Promise<SessionUser | undefined> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return undefined;
  const session = await verifySessionToken(token);
  if (!session) return undefined;

  const user = await getUserByEmail(session.email);
  if (!user || !isActiveUser(user)) return undefined;

  return {
    email: user.rowKey,
    displayName: user.displayName,
    roles: parseRoles(user),
  };
}

// ---------- Server Components / Server Actions: redirect on failure ----------

/** Redirects to /login if not authenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Redirects to /login if not authenticated, to / if authenticated but wrong role. */
export async function requireRole(roles: readonly Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, roles)) {
    redirect("/");
  }
  return user;
}

// ---------- Route Handlers: return a Response instead of redirecting ----------
// Usage: `const auth = await requireApiUser(); if ("error" in auth) return auth.error;`

type ApiAuthResult = { user: SessionUser } | { error: NextResponse };

export async function requireApiUser(): Promise<ApiAuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

export async function requireApiRole(roles: readonly Role[]): Promise<ApiAuthResult> {
  const result = await requireApiUser();
  if ("error" in result) return result;
  if (!hasAnyRole(result.user.roles, roles)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}
