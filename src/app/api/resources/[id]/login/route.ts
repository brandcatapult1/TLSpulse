// Crew logins: give a resource their own view-only account, or switch it off.
import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { bad, readJson } from "@/lib/http";
import { tempPassword } from "@/lib/passwords";

type Ctx = { params: Promise<{ id: string }> };
const loginSelect = { id: true, email: true, status: true, mustChangePw: true, lastLoginAt: true } as const;

/** Create the login (or re-enable it). Returns a one-time temporary password. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const parsed = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email").optional() }).safeParse(await readJson(req));
  if (!parsed.success) return bad(parsed.error.issues[0].message);

  const resource = await db.resource.findUnique({ where: { id }, include: { login: { select: loginSelect } } });
  if (!resource) return bad("Resource not found", 404);

  const password = tempPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  if (resource.login) {
    // Re-enable an existing crew login with a fresh password.
    const login = await db.user.update({ where: { id: resource.login.id }, data: { status: "ACTIVE", passwordHash, mustChangePw: true }, select: loginSelect });
    await writeAudit({ actorId: g.user.id, action: "CREW_LOGIN_ENABLED", entity: "resource", entityId: id, summary: `${g.user.name} re-enabled ${resource.name}'s login` });
    return NextResponse.json({ login, tempPassword: password });
  }

  const email = parsed.data.email;
  if (!email) return bad("Enter an email for the login");
  if (await db.user.findUnique({ where: { email } })) return bad("That email already has a login", 409);
  const login = await db.user.create({
    data: { name: resource.name, email, role: "CREW", resourceId: id, passwordHash, mustChangePw: true },
    select: loginSelect,
  });
  await writeAudit({ actorId: g.user.id, action: "CREW_LOGIN_CREATED", entity: "resource", entityId: id, summary: `${g.user.name} gave ${resource.name} a crew login (${email})` });
  return NextResponse.json({ login, tempPassword: password }, { status: 201 });
}

/** Switch the login off (kept, so it can be re-enabled). */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const resource = await db.resource.findUnique({ where: { id }, include: { login: { select: { id: true } } } });
  if (!resource?.login) return bad("This resource has no login", 404);
  await db.user.update({ where: { id: resource.login.id }, data: { status: "INACTIVE" } });
  await writeAudit({ actorId: g.user.id, action: "CREW_LOGIN_DISABLED", entity: "resource", entityId: id, summary: `${g.user.name} switched off ${resource.name}'s login` });
  return NextResponse.json({ ok: true });
}
