import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { clashMessage } from "@/lib/clash-message";
import { isClash } from "@/lib/conflicts";
import { db } from "@/lib/db";
import { fmtShort, isYmd, toDbDate } from "@/lib/dates";
import { checkConflicts, listShoots, shootInclude, toShootDTO } from "@/lib/shoots";
import { firstError, ShootCreate } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const g = await requireUser("calendar.view");
  if (g.error) return g.error;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!isYmd(from) || !isYmd(to)) return NextResponse.json({ error: "from and to are required (YYYY-MM-DD)" }, { status: 400 });
  return NextResponse.json({ shoots: await listShoots(from, to) });
}

export async function POST(req: NextRequest) {
  const g = await requireUser("shoot.create");
  if (g.error) return g.error;
  const parsed = ShootCreate.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const input = parsed.data;

  const brand = await db.brand.findUnique({ where: { id: input.brandId } });
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 400 });
  const resourceIds = [...new Set(input.resourceIds)];

  // Computed before insert so the warnings describe what was already there.
  const warnings = await checkConflicts({ ...input, resourceIds });
  // Same person on overlapping times is not allowed (other conflicts only warn).
  const clashes = input.status === "CANCELLED" ? [] : warnings.resourceConflicts.filter(isClash);
  if (clashes.length) {
    return NextResponse.json({ error: clashMessage(clashes, input.date), code: "RESOURCE_CLASH", clashes }, { status: 409 });
  }

  const shoot = await db.shoot.create({
    data: {
      brandId: input.brandId,
      shootType: input.shootType,
      date: toDbDate(input.date),
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      notes: input.notes,
      status: input.status ?? "PLANNED",
      createdById: g.user.id,
      updatedById: g.user.id,
      assignments: { create: resourceIds.map((resourceId) => ({ resourceId, createdById: g.user.id })) },
    },
    include: shootInclude,
  });

  const dto = toShootDTO(shoot);
  await writeAudit({
    actorId: g.user.id,
    action: "SHOOT_CREATED",
    entity: "shoot",
    entityId: shoot.id,
    summary: `${g.user.name} created ${brand.name} shoot — ${fmtShort(input.date)}${dto.resources.length ? ` with ${dto.resources.map((r) => r.name).join(", ")}` : ""}`,
  });
  return NextResponse.json({ shoot: dto, warnings }, { status: 201 });
}
