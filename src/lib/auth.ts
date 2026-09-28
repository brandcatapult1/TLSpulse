// Server-side auth helpers for route handlers and server components.
// The JWT only proves who you are; role and status are re-read from the DB on every
// call so a blocked user or a role change takes effect immediately.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "./db";
import { can, type Action } from "./permissions";
import { SESSION_COOKIE, verifySession } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  mustChangePw: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const claims = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = await db.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, name: true, email: true, role: true, mustChangePw: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePw: user.mustChangePw };
}

type Guard = { user: CurrentUser; error?: never } | { user?: never; error: NextResponse };

/** For API routes: `const g = await requireUser(); if (g.error) return g.error;` */
export async function requireUser(action?: Action): Promise<Guard> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (user.mustChangePw) return { error: NextResponse.json({ error: "Password change required" }, { status: 403 }) };
  if (action && !can(user.role, action)) return { error: NextResponse.json({ error: "Not allowed" }, { status: 403 }) };
  return { user };
}

export async function requireAdmin(): Promise<Guard> {
  const g = await requireUser();
  if (g.error) return g;
  if (g.user.role !== "ADMIN") return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return g;
}

/** For server-component pages. */
export async function requireUserPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePw) redirect("/change-password");
  return user;
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await requireUserPage();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
