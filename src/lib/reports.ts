// Report aggregation (Handbook §14). Monthly volumes are small, so we load the month
// once and aggregate in memory; the counting rules live here and are unit-tested.
import type { ShootStatus, ShootType } from "./types";

export type ReportShoot = {
  id: string;
  date: string;
  brandId: string;
  brandName: string;
  shootType: ShootType;
  status: ShootStatus;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  resources: { id: string; name: string; role: string; teamId: string; teamName: string; teamType: "INTERNAL" | "EXTERNAL" }[];
};

export type ReportFilters = {
  shootType?: ShootType;
  brandId?: string;
  resourceId?: string;
  teamId?: string;
  status?: ShootStatus;
};

type Split = { total: number; social: number; realtime: number };
const split = (): Split => ({ total: 0, social: 0, realtime: 0 });
const bump = (s: Split, t: ShootType) => {
  s.total++;
  if (t === "SOCIAL_MEDIA") s.social++;
  else s.realtime++;
};

export function applyFilters(shoots: ReportShoot[], f: ReportFilters) {
  return shoots.filter(
    (s) =>
      (!f.shootType || s.shootType === f.shootType) &&
      (!f.brandId || s.brandId === f.brandId) &&
      (!f.resourceId || s.resources.some((r) => r.id === f.resourceId)) &&
      (!f.teamId || s.resources.some((r) => r.teamId === f.teamId)),
  );
}

/**
 * Rules:
 * - a shoot counts once; an assignment is one shoot × one resource;
 * - cancelled shoots are excluded from every number except the Cancelled tile,
 *   unless the Status filter asks for them explicitly.
 */
export function buildReport(all: ReportShoot[], f: ReportFilters) {
  const filtered = applyFilters(all, f);
  const counted = f.status ? filtered.filter((s) => s.status === f.status) : filtered.filter((s) => s.status !== "CANCELLED");
  const cancelled = filtered.filter((s) => s.status === "CANCELLED").length;

  const overview = split();
  const usedResources = new Set<string>();
  const byResource = new Map<string, Split & { id: string; name: string; role: string; teamName: string }>();
  const byTeam = new Map<string, { id: string; name: string; type: "INTERNAL" | "EXTERNAL"; assignments: number; shoots: Set<string> }>();
  const byBrand = new Map<string, Split & { id: string; name: string }>();

  for (const s of counted) {
    bump(overview, s.shootType);
    const b = byBrand.get(s.brandId) ?? { id: s.brandId, name: s.brandName, ...split() };
    bump(b, s.shootType);
    byBrand.set(s.brandId, b);

    for (const r of s.resources) {
      // With a team/resource filter, only that slice's assignments are counted.
      if (f.resourceId && r.id !== f.resourceId) continue;
      if (f.teamId && r.teamId !== f.teamId) continue;
      usedResources.add(r.id);
      const row = byResource.get(r.id) ?? { id: r.id, name: r.name, role: r.role, teamName: r.teamName, ...split() };
      bump(row, s.shootType);
      byResource.set(r.id, row);
      const t = byTeam.get(r.teamId) ?? { id: r.teamId, name: r.teamName, type: r.teamType, assignments: 0, shoots: new Set<string>() };
      t.assignments++;
      t.shoots.add(s.id);
      byTeam.set(r.teamId, t);
    }
  }

  const desc = <T extends { name: string }>(key: (x: T) => number) => (a: T, b: T) => key(b) - key(a) || a.name.localeCompare(b.name);
  const unassigned = counted.filter((s) => s.resources.length === 0).sort(byDateTime).map(row);
  return {
    overview: { ...overview, cancelled, holds: counted.filter((s) => s.status === "DATE_HOLD").length, resourcesUsed: usedResources.size, unassigned: unassigned.length },
    unassigned,
    byResource: [...byResource.values()].sort(desc((x) => x.total)),
    byTeam: [...byTeam.values()].map(({ shoots, ...t }) => ({ ...t, shoots: shoots.size })).sort(desc((x) => x.assignments)),
    byBrand: [...byBrand.values()].sort(desc((x) => x.total)),
  };
}

/** Date, then timed before untimed, then start time. */
const byDateTime = (a: ReportShoot, b: ReportShoot) =>
  a.date.localeCompare(b.date) || (a.startTime ? (b.startTime ? a.startTime.localeCompare(b.startTime) : -1) : b.startTime ? 1 : 0) || a.brandName.localeCompare(b.brandName);

const row = (s: ReportShoot) => ({
  id: s.id,
  date: s.date,
  startTime: s.startTime,
  endTime: s.endTime,
  location: s.location,
  brandName: s.brandName,
  shootType: s.shootType,
  status: s.status,
});

const countedStatus = (f: ReportFilters) => (s: ReportShoot) => (f.status ? s.status === f.status : s.status !== "CANCELLED");

export function resourceDrilldown(all: ReportShoot[], resourceId: string, f: ReportFilters) {
  const list = applyFilters(all, { ...f, resourceId }).filter(countedStatus(f)).sort(byDateTime);
  const out = split();
  for (const s of list) bump(out, s.shootType);
  return { ...out, shoots: list.map(row) };
}

/** A team's shoots in the period, with which of its members were on each one. */
export function teamDrilldown(all: ReportShoot[], teamId: string, f: ReportFilters) {
  const list = applyFilters(all, { ...f, teamId }).filter(countedStatus(f)).sort(byDateTime);
  const out = split();
  let assignments = 0;
  const shoots = list.map((s) => {
    bump(out, s.shootType);
    const crew = s.resources.filter((r) => r.teamId === teamId && (!f.resourceId || r.id === f.resourceId));
    assignments += crew.length;
    return { ...row(s), crew: crew.map((r) => ({ id: r.id, name: r.name, role: r.role })) };
  });
  return { ...out, assignments, shoots };
}
