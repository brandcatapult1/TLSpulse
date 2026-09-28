import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bad, readJson, uniqueError } from "@/lib/http";
import { can } from "@/lib/permissions";
import { BrandInput, firstError } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const g = await requireUser("brand.edit");
  if (g.error) return g.error;
  const { id } = await params;
  const parsed = BrandInput.partial().safeParse(await readJson(req));
  if (!parsed.success) return bad(firstError(parsed.error));
  const before = await db.brand.findUnique({ where: { id } });
  if (!before) return bad("Brand not found", 404);
  if (parsed.data.status && parsed.data.status !== before.status && !can(g.user.role, "brand.deactivate")) {
    return bad("Only an admin can deactivate brands", 403);
  }
  try {
    const brand = await db.brand.update({ where: { id }, data: parsed.data });
    const what = parsed.data.status && parsed.data.status !== before.status ? (brand.status === "ACTIVE" ? "reactivated" : "deactivated") : "updated";
    await writeAudit({ actorId: g.user.id, action: "BRAND_UPDATED", entity: "brand", entityId: id, summary: `${g.user.name} ${what} brand ${brand.name}` });
    return NextResponse.json({ brand });
  } catch (e) {
    return uniqueError(e, "A brand with that name");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const brand = await db.brand.findUnique({ where: { id }, include: { _count: { select: { shoots: true } } } });
  if (!brand) return bad("Brand not found", 404);
  if (brand._count.shoots > 0) return bad(`${brand.name} has ${brand._count.shoots} shoot(s). Deactivate it instead.`, 409);
  await db.brand.delete({ where: { id } });
  await writeAudit({ actorId: g.user.id, action: "BRAND_DELETED", entity: "brand", entityId: id, summary: `${g.user.name} deleted brand ${brand.name}` });
  return NextResponse.json({ ok: true });
}
