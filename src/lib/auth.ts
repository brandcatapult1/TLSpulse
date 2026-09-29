// Server-side auth helpers for route handlers and server components.
// The JWT only proves who you are; role and status are re-read from the DB on every
// call so a blocked user or a role change takes effect immediately.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "./db";
import { can, CREW_LOGIN_ENABLED, type Action } from "./permissions";
import { SESSION_COOKIE, verifySession } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER" | "CREW";
  mustChangePw: boolean;
  /** Crew only: the resource whose shoots they may see. */
  resourceId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const claims = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const user = await db.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, name: true, email: true, role: true, mustChangePw: true, status: true, resourceId: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  if (user.role === "CREW" && !CREW_LOGIN_ENABLED) return null; // ends any open crew session
  return { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePw: user.mustChangePw, resourceId: user.resourceId };
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

/** Pages crew can't open (brands, resources) send them back to their calendar. */
export async function requireStaffPage(): Promise<CurrentUser> {
  const user = await requireUserPage();
  if (user.role === "CREW") redirect("/");
  return user;
}

/**
 * Prisma filter limiting shoots to what this user may see: everything for staff,
 * only shoots they're assigned to for crew (nothing if the crew login lost its resource).
 */
export function shootScope(user: CurrentUser) {
  if (user.role !== "CREW") return {};
  return { assignments: { some: { resourceId: user.resourceId ?? "__none__" } } };
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await requireUserPage();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
