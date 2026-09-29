// Server-side shoot queries and mapping to client DTOs.
import type { Prisma } from "@prisma/client";
import { findResourceConflicts } from "./conflicts";
import { db } from "./db";
import { fromDbDate, sortShoots, toDbDate } from "./dates";
import type { ConflictReport, ShootDTO, ShootType } from "./types";

export const shootInclude = {
  brand: { select: { id: true, name: true } },
  assignments: {
    select: { resource: { select: { id: true, name: true, role: true, team: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ShootInclude;

type ShootRow = Prisma.ShootGetPayload<{ include: typeof shootInclude }>;

export function toShootDTO(s: ShootRow): ShootDTO {
  return {
    id: s.id,
    brandId: s.brand.id,
    brandName: s.brand.name,
    shootType: s.shootType,
    date: fromDbDate(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location,
    locationLat: s.locationLat,
    locationLng: s.locationLng,
    locationPlaceId: s.locationPlaceId,
    status: s.status,
    notes: s.notes,
    resources: s.assignments.map((a) => ({
      id: a.resource.id,
      name: a.resource.name,
      role: a.resource.role,
      teamName: a.resource.team.name,
    })),
  };
}

export async function listShoots(from: string, to: string, scope: Prisma.ShootWhereInput = {}): Promise<ShootDTO[]> {
  const rows = await db.shoot.findMany({
    where: { date: { gte: toDbDate(from), lte: toDbDate(to) }, deletedAt: null, ...scope },
    include: shootInclude,
    orderBy: { date: "asc" },
  });
  return sortShoots(rows.map(toShootDTO));
}

export async function getShoot(id: string, scope: Prisma.ShootWhereInput = {}) {
  return db.shoot.findFirst({ where: { id, deletedAt: null, ...scope }, include: shootInclude });
}

/** Everything on a date that could clash: live (non-cancelled, non-deleted) shoots. */
export async function checkConflicts(input: {
  date: string;
  brandId?: string | null;
  location?: string | null;
  locationPlaceId?: string | null;
  shootType?: ShootType | null;
  startTime: string | null;
  endTime: string | null;
  resourceIds: string[];
  excludeShootId?: string | null;
}): Promise<ConflictReport> {
  const others = await db.shoot.findMany({
    where: {
      date: toDbDate(input.date),
      deletedAt: null,
      status: { not: "CANCELLED" },
      ...(input.excludeShootId ? { id: { not: input.excludeShootId } } : {}),
    },
    include: shootInclude,
  });
  const dtos = sortShoots(others.map(toShootDTO));
  return {
    dateShoots: dtos.map((s) => ({ id: s.id, brandName: s.brandName, startTime: s.startTime, shootType: s.shootType })),
    resourceConflicts: findResourceConflicts(input, dtos),
  };
}
