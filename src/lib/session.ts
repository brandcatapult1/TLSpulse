// Session token helpers. Edge-safe (used by middleware), so no Prisma here.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "tlsp_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Role = "ADMIN" | "USER" | "CREW";
export type SessionClaims = { sub: string; role: Role; name: string; mustChangePw: boolean };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signSession(claims: SessionClaims) {
  return new SignJWT({ role: claims.role, name: claims.name, mustChangePw: claims.mustChangePw })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      role: payload.role === "ADMIN" || payload.role === "CREW" ? payload.role : "USER",
      name: String(payload.name ?? ""),
      mustChangePw: Boolean(payload.mustChangePw),
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
