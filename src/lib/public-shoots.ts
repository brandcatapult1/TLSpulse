// Public calendar data. Explicit select: notes, audit fields and real IDs never leave the server.
import { db } from "./db";
import { fromDbDate, sortShoots, toDbDate } from "./dates";
import type { ShootDTO } from "./types";

export async function listPublicShoots(from: string, to: string): Promise<ShootDTO[]> {
  const rows = await db.shoot.findMany({
    where: { date: { gte: toDbDate(from), lte: toDbDate(to) }, deletedAt: null, status: { not: "CANCELLED" } },
    select: {
      shootType: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      status: true,
      brand: { select: { name: true } },
      assignments: { select: { resource: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  return sortShoots(
    rows.map((s, i) => ({
      id: `p${i}`,
      brandId: "",
      brandName: s.brand.name,
      shootType: s.shootType,
      date: fromDbDate(s.date),
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      status: s.status,
      resources: s.assignments.map((a, j) => ({ id: `p${i}-${j}`, name: a.resource.name, role: a.resource.role, teamName: "" })),
    })),
  );
}
