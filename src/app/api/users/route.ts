import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { bad, readJson } from "@/lib/http";
import { tempPassword } from "@/lib/passwords";
import { firstError, UserCreate } from "@/lib/validators";

const publicUser = { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, mustChangePw: true, createdAt: true } as const;

export async function GET() {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const users = await db.user.findMany({ orderBy: { name: "asc" }, select: publicUser });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const parsed = UserCreate.safeParse(await readJson(req));
  if (!parsed.success) return bad(firstError(parsed.error));
  if (await db.user.findUnique({ where: { email: parsed.data.email } })) return bad("A user with that email already exists", 409);
  const password = tempPassword();
  const user = await db.user.create({
    data: { ...parsed.data, passwordHash: await bcrypt.hash(password, 10), mustChangePw: true },
    select: publicUser,
  });
  await writeAudit({ actorId: g.user.id, action: "USER_CREATED", entity: "user", entityId: user.id, summary: `${g.user.name} added ${user.role === "ADMIN" ? "admin" : "user"} ${user.name}` });
  // The temporary password is returned exactly once so the admin can pass it on.
  return NextResponse.json({ user, tempPassword: password }, { status: 201 });
}
