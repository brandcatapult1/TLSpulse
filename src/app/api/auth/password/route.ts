import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  // Not requireUser(): this route must work while a password change is pending.
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "Choose a password different from the current one" }, { status: 400 });
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is wrong" }, { status: 400 });
  }

  await db.user.update({
    where: { id: me.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePw: false },
  });
  await writeAudit({ actorId: me.id, action: "PASSWORD_CHANGED", entity: "user", entityId: me.id, summary: `${me.name} changed their password` });

  // Re-issue the cookie so the middleware stops redirecting to /change-password.
  const token = await signSession({ sub: me.id, role: me.role, name: me.name, mustChangePw: false });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
