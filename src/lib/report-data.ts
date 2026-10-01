import type { NextRequest } from "next/server";
import { db } from "./db";
import { fromDbDate, toDbDate } from "./dates";
import { periodFromParams, periodLabel, type Period } from "./report-period";
import type { ReportFilters, ReportShoot } from "./reports";

export async function loadPeriod(from: string, to: string): Promise<ReportShoot[]> {
  const rows = await db.shoot.findMany({
    where: { date: { gte: toDbDate(from), lte: toDbDate(to) }, deletedAt: null },
    select: {
      id: true,
      date: true,
      shootType: true,
      status: true,
      startTime: true,
      endTime: true,
      location: true,
      brand: { select: { id: true, name: true } },
      assignments: { select: { resource: { select: { id: true, name: true, role: true, team: { select: { id: true, name: true, type: true } } } } } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    date: fromDbDate(s.date),
    brandId: s.brand.id,
    brandName: s.brand.name,
    shootType: s.shootType,
    status: s.status,
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location,
    resources: s.assignments.map(({ resource: r }) => ({ id: r.id, name: r.name, role: r.role, teamId: r.team.id, teamName: r.team.name, teamType: r.team.type })),
  }));
}

export function readFilters(req: NextRequest): { period: Period & { label: string }; filters: ReportFilters } {
  const p = req.nextUrl.searchParams;
  const period = periodFromParams((k) => p.get(k));
  const pick = <T extends string>(v: string | null, allowed: readonly T[]) => (v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined);
  return {
    period: { ...period, label: periodLabel(period) },
    filters: {
      shootType: pick(p.get("type"), ["SOCIAL_MEDIA", "REAL_TIME_VISIT"] as const),
      status: pick(p.get("status"), ["PLANNED", "RESCHEDULED", "CANCELLED", "DATE_HOLD"] as const),
      brandId: p.get("brandId") || undefined,
      resourceId: p.get("resourceId") || undefined,
      teamId: p.get("teamId") || undefined,
    },
  };
}
