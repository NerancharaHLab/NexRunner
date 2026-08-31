import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "stw_session";
const SESSION_DURATION = "7d";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Copy .env.local.example to .env.local and set a real random " +
        "value (e.g. `openssl rand -base64 32`)."
    );
  }
  return new TextEncoder().encode(secret);
}

/** The JWT only proves identity (who logged in with the correct password) —
 *  displayName/roles/active are always read fresh from the Users table on
 *  every request (see lib/auth/guard.ts's getCurrentUser()), so a role
 *  change or deactivation takes effect immediately instead of waiting for
 *  the token to expire or the user to log in again. */
export interface SessionTokenPayload {
  email: string;
}

export async function createSessionToken(payload: SessionTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | undefined> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.email !== "string") return undefined;
    return { email: payload.email };
  } catch {
    // Expired, tampered, or malformed — treat all the same as "not logged in".
    return undefined;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days, matches SESSION_DURATION above
};
