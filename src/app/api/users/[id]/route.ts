import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { bad, readJson } from "@/lib/http";
import { tempPassword } from "@/lib/passwords";
import { firstError, UserPatch } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const parsed = UserPatch.safeParse(await readJson(req));
  if (!parsed.success) return bad(firstError(parsed.error));
  const { resetPassword, ...fields } = parsed.data;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return bad("User not found", 404);
  if (id === g.user.id && (fields.role === "USER" || fields.status === "INACTIVE")) {
    return bad("You can't demote or block yourself");
  }
  // Never leave the system without an active admin.
  if (target.role === "ADMIN" && (fields.role === "USER" || fields.status === "INACTIVE")) {
    const admins = await db.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
    if (admins <= 1) return bad("At least one active admin is required");
  }

  let password: string | undefined;
  const data: Record<string, unknown> = { ...fields };
  if (resetPassword) {
    password = tempPassword();
    data.passwordHash = await bcrypt.hash(password, 10);
    data.mustChangePw = true;
  }
  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, mustChangePw: true, createdAt: true },
  });

  const bits = [
    fields.role && fields.role !== target.role ? `made ${user.name} ${user.role === "ADMIN" ? "an admin" : "a user"}` : null,
    fields.status && fields.status !== target.status ? `${user.status === "ACTIVE" ? "unblocked" : "blocked"} ${user.name}` : null,
    resetPassword ? `reset ${user.name}'s password` : null,
    fields.name && fields.name !== target.name ? `renamed ${target.name} to ${user.name}` : null,
  ].filter(Boolean);
  if (bits.length) await writeAudit({ actorId: g.user.id, action: "USER_UPDATED", entity: "user", entityId: id, summary: `${g.user.name} ${bits.join(", ")}` });

  return NextResponse.json({ user, ...(password ? { tempPassword: password } : {}) });
}
