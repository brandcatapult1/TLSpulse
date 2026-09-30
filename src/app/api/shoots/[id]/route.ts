import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin, requireUser, shootScope } from "@/lib/auth";
import { clashMessage } from "@/lib/clash-message";
import { clashKey, isClash } from "@/lib/conflicts";
import { db } from "@/lib/db";
import { fmtShort, fmtTimeRange, fromDbDate, toDbDate, ymd } from "@/lib/dates";
import { checkConflicts, getShoot, shootInclude, toShootDTO } from "@/lib/shoots";
import { firstError, ShootPatch } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

const STATUS_WORD = { PLANNED: "planned", RESCHEDULED: "rescheduled", CANCELLED: "cancelled" } as const;
const TYPE_WORD = { SOCIAL_MEDIA: "Social Media", REAL_TIME_VISIT: "Real Time Visit" } as const;

export async function GET(_req: NextRequest, { params }: Ctx) {
  const g = await requireUser("shoot.view");
  if (g.error) return g.error;
  const { id } = await params;
  const shoot = await getShoot(id, shootScope(g.user));
  if (!shoot) return NextResponse.json({ error: "Shoot not found" }, { status: 404 });

  const [history, people] = await Promise.all([
    db.auditLog.findMany({ where: { entity: "shoot", entityId: id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.user.findMany({ where: { id: { in: [shoot.createdById, shoot.updatedById] } }, select: { id: true, name: true } }),
  ]);
  const nameOf = (uid: string) => people.find((p) => p.id === uid)?.name ?? "Someone";
  return NextResponse.json({
    shoot: toShootDTO(shoot),
    meta: {
      createdBy: nameOf(shoot.createdById),
      createdAt: shoot.createdAt,
      updatedBy: nameOf(shoot.updatedById),
      updatedAt: shoot.updatedAt,
    },
    history: history.map((h) => ({ id: h.id, summary: h.summary, at: h.createdAt })),
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const g = await requireUser("shoot.edit");
  if (g.error) return g.error;
  const { id } = await params;
  const parsed = ShootPatch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const patch = parsed.data;

  const before = await getShoot(id);
  if (!before) return NextResponse.json({ error: "Shoot not found" }, { status: 404 });
  const prev = toShootDTO(before);
  // Cancelling is final: a cancelled shoot can't go back to Planned/Rescheduled.
  if (prev.status === "CANCELLED" && patch.status && patch.status !== "CANCELLED") {
    return NextResponse.json({ error: "A cancelled shoot can't be restored. Create a new shoot instead." }, { status: 400 });
  }

  // Resulting times must still be ordered even when only one side is patched.
  const nextStart = patch.startTime !== undefined ? patch.startTime : prev.startTime;
  const nextEnd = patch.endTime !== undefined ? patch.endTime : prev.endTime;
  if (nextStart && nextEnd && nextEnd <= nextStart) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }
  if (nextEnd && !nextStart) {
    return NextResponse.json({ error: "Add a start time, or clear the end time" }, { status: 400 });
  }

  let brandName = prev.brandName;
  if (patch.brandId && patch.brandId !== prev.brandId) {
    const brand = await db.brand.findUnique({ where: { id: patch.brandId } });
    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 400 });
    brandName = brand.name;
  }

  const dateChanged = patch.date !== undefined && patch.date !== prev.date;
  if (dateChanged && patch.date! < ymd(new Date())) {
    return NextResponse.json({ error: "A shoot can't be moved to a past date" }, { status: 400 });
  }
  let status = patch.status ?? prev.status;
  // A date move on a planned shoot marks it Rescheduled (Handbook §8.3).
  if (dateChanged && prev.status === "PLANNED" && status === "PLANNED") status = "RESCHEDULED";

  const nextResourceIds = patch.resourceIds ? [...new Set(patch.resourceIds)] : prev.resources.map((r) => r.id);
  const prevIds = new Set(prev.resources.map((r) => r.id));
  const added = nextResourceIds.filter((r) => !prevIds.has(r));
  const removed = [...prevIds].filter((r) => !nextResourceIds.includes(r));

  const nextDate = patch.date ?? prev.date;
  const warnings =
    status === "CANCELLED"
      ? { dateShoots: [], resourceConflicts: [] }
      : await checkConflicts({
          date: nextDate,
          brandId: patch.brandId ?? prev.brandId,
          shootType: patch.shootType ?? prev.shootType,
          location: patch.location !== undefined ? patch.location : prev.location,
          locationPlaceId: patch.locationPlaceId !== undefined ? patch.locationPlaceId : prev.locationPlaceId,
          startTime: nextStart,
          endTime: nextEnd,
          resourceIds: nextResourceIds,
          excludeShootId: id,
        });

  // Block only clashes this edit would create, so older overlapping data can still be
  // edited (e.g. notes) without first being untangled.
  const clashes = warnings.resourceConflicts.filter(isClash);
  if (clashes.length) {
    const existing =
      prev.status === "CANCELLED"
        ? new Set<string>()
        : new Set(
            (
              await checkConflicts({
                date: prev.date,
                brandId: prev.brandId,
                shootType: prev.shootType,
                location: prev.location,
                locationPlaceId: prev.locationPlaceId,
                startTime: prev.startTime,
                endTime: prev.endTime,
                resourceIds: prev.resources.map((r) => r.id),
                excludeShootId: id,
              })
            ).resourceConflicts
              .filter(isClash)
              .map(clashKey),
          );
    const fresh = clashes.filter((c) => !existing.has(clashKey(c)));
    if (fresh.length) {
      return NextResponse.json({ error: clashMessage(fresh, nextDate), code: "RESOURCE_CLASH", clashes: fresh }, { status: 409 });
    }
  }

  const updated = await db.$transaction(async (tx) => {
    if (removed.length) await tx.shootAssignment.deleteMany({ where: { shootId: id, resourceId: { in: removed } } });
    if (added.length) {
      await tx.shootAssignment.createMany({ data: added.map((resourceId) => ({ shootId: id, resourceId, createdById: g.user.id })) });
    }
    return tx.shoot.update({
      where: { id },
      data: {
        brandId: patch.brandId,
        shootType: patch.shootType,
        date: patch.date ? toDbDate(patch.date) : undefined,
        startTime: patch.startTime,
        endTime: patch.endTime,
        location: patch.location,
        locationLat: patch.locationLat,
        locationLng: patch.locationLng,
        locationPlaceId: patch.locationPlaceId,
        notes: patch.notes,
        status,
        updatedById: g.user.id,
      },
      include: shootInclude,
    });
  });
  const dto = toShootDTO(updated);

  // Human-readable audit lines (Handbook §8.5).
  const who = g.user.name;
  const label = `${brandName} shoot`;
  const lines: { action: string; summary: string; diff?: object }[] = [];
  if (dateChanged) {
    lines.push({ action: "SHOOT_MOVED", summary: `${who} changed ${label} date — ${fmtShort(prev.date)} → ${fmtShort(dto.date)}`, diff: { from: prev.date, to: dto.date } });
  }
  if (status !== prev.status && !(dateChanged && status === "RESCHEDULED")) {
    lines.push({ action: "SHOOT_STATUS", summary: `${who} marked ${label} — ${fmtShort(dto.date)} as ${STATUS_WORD[status]}` });
  }
  const resName = async (ids: string[]) =>
    (await db.resource.findMany({ where: { id: { in: ids } }, select: { name: true } })).map((r) => r.name).join(", ");
  if (added.length) lines.push({ action: "RESOURCE_ASSIGNED", summary: `${who} assigned ${await resName(added)} to ${label}` });
  if (removed.length) lines.push({ action: "RESOURCE_UNASSIGNED", summary: `${who} removed ${await resName(removed)} from ${label}` });
  const changed: string[] = [];
  if (brandName !== prev.brandName) changed.push(`brand ${prev.brandName} → ${brandName}`);
  if (dto.shootType !== prev.shootType) changed.push(`type → ${TYPE_WORD[dto.shootType]}`);
  if (dto.startTime !== prev.startTime || dto.endTime !== prev.endTime) changed.push(`time → ${fmtTimeRange(dto.startTime, dto.endTime) || "no time"}`);
  if (dto.location !== prev.location || dto.locationPlaceId !== prev.locationPlaceId || dto.locationLat !== prev.locationLat) changed.push("location");
  if (dto.notes !== prev.notes) changed.push("notes");
  if (changed.length) lines.push({ action: "SHOOT_UPDATED", summary: `${who} updated ${label} — ${changed.join(", ")}` });
  for (const l of lines) {
    await writeAudit({ actorId: g.user.id, entity: "shoot", entityId: id, action: l.action, summary: l.summary, diff: l.diff as never });
  }

  return NextResponse.json({ shoot: dto, warnings, previousDate: fromDbDate(before.date) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const shoot = await getShoot(id);
  if (!shoot) return NextResponse.json({ error: "Shoot not found" }, { status: 404 });
  await db.shoot.update({ where: { id }, data: { deletedAt: new Date(), updatedById: g.user.id } });
  await writeAudit({
    actorId: g.user.id,
    action: "SHOOT_DELETED",
    entity: "shoot",
    entityId: id,
    summary: `${g.user.name} deleted ${shoot.brand.name} shoot — ${fmtShort(fromDbDate(shoot.date))}`,
  });
  return NextResponse.json({ ok: true });
}
