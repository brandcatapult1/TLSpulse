import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bad, readJson } from "@/lib/http";
import { firstError, ResourceInput } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const g = await requireUser("resource.write");
  if (g.error) return g.error;
  const { id } = await params;
  const parsed = ResourceInput.partial().safeParse(await readJson(req));
  if (!parsed.success) return bad(firstError(parsed.error));
  if (parsed.data.teamId && !(await db.team.findUnique({ where: { id: parsed.data.teamId } }))) return bad("Team not found");
  const before = await db.resource.findUnique({ where: { id } });
  if (!before) return bad("Resource not found", 404);
  const resource = await db.resource.update({ where: { id }, data: parsed.data });
  const what = parsed.data.status && parsed.data.status !== before.status ? (resource.status === "ACTIVE" ? "reactivated" : "deactivated") : "updated";
  await writeAudit({ actorId: g.user.id, action: "RESOURCE_UPDATED", entity: "resource", entityId: id, summary: `${g.user.name} ${what} ${resource.name}` });
  return NextResponse.json({ resource });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const g = await requireUser("resource.write");
  if (g.error) return g.error;
  const { id } = await params;
  const r = await db.resource.findUnique({ where: { id }, include: { _count: { select: { assignments: true } } } });
  if (!r) return bad("Resource not found", 404);
  if (r._count.assignments > 0) return bad(`${r.name} is on ${r._count.assignments} shoot(s). Deactivate instead.`, 409);
  await db.resource.delete({ where: { id } });
  await writeAudit({ actorId: g.user.id, action: "RESOURCE_DELETED", entity: "resource", entityId: id, summary: `${g.user.name} deleted ${r.name}` });
  return NextResponse.json({ ok: true });
}
