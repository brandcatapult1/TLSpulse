// Conflict rules (Handbook §8.1–8.2, updated 28 Sep 2026):
// - A resource on two shoots whose TIMES overlap is a clash, and a clash blocks saving.
// - If either shoot has no time, it's only a warning ("untimed"); so is the same person
//   on the same day at non-overlapping times ("sameDay").
// - Exception: a Social Media Shoot and a Real Time Visit for the SAME brand at the SAME
//   location may share crew at overlapping times — note only ("sameVisit"). Two shoots of
//   the same type still clash.
// - Several shoots on one date are always allowed; that's a warning only.
import type { ResourceConflict, ShootType } from "./types";

export type OtherShoot = {
  id: string;
  shootType: ShootType;
  brandId: string;
  brandName: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  resources: { id: string; name: string }[];
};

/** A start with no end is treated as a one-hour booking. */
function endOf(start: string, end: string | null) {
  if (end) return end;
  const [h, m] = start.split(":").map(Number);
  const t = Math.min(h * 60 + m + 60, 24 * 60 - 1);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Both shoots must have a start time to overlap; touching edges (12:00–14:00 vs 14:00–16:00) don't. */
export function timesOverlap(aStart: string | null, aEnd: string | null, bStart: string | null, bEnd: string | null) {
  if (!aStart || !bStart) return false;
  return aStart < endOf(bStart, bEnd) && bStart < endOf(aStart, aEnd);
}

/** "Aerocity, New Delhi" == "aerocity new delhi". Empty locations never match. */
export function sameLocation(a: string | null | undefined, b: string | null | undefined) {
  const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return norm(a) !== "" && norm(a) === norm(b);
}

export function findResourceConflicts(
  target: { startTime: string | null; endTime: string | null; resourceIds: string[]; brandId?: string | null; location?: string | null; shootType?: ShootType | null },
  others: OtherShoot[],
): ResourceConflict[] {
  const wanted = new Set(target.resourceIds);
  const out: ResourceConflict[] = [];
  for (const s of others) {
    for (const r of s.resources) {
      if (!wanted.has(r.id)) continue;
      const overlap = timesOverlap(target.startTime, target.endTime, s.startTime, s.endTime);
      const sameBrand = !!target.brandId && target.brandId === s.brandId;
      const otherType = !!target.shootType && target.shootType !== s.shootType;
      const samePlace = sameLocation(target.location, s.location);
      const sameVisit = sameBrand && otherType && samePlace;
      const severity: ResourceConflict["severity"] =
        !target.startTime || !s.startTime ? "untimed" : !overlap ? "sameDay" : sameVisit ? "sameVisit" : "clash";
      const reason: ResourceConflict["reason"] =
        severity !== "clash"
          ? undefined
          : !sameBrand
            ? "differentBrand"
            : !otherType
              ? "sameType"
              : !target.location?.trim() || !s.location?.trim()
                ? "noLocation"
                : "differentLocation";
      out.push({
        resourceId: r.id,
        resourceName: r.name,
        severity,
        ...(reason ? { reason } : {}),
        shoot: { id: s.id, brandName: s.brandName, shootType: s.shootType, location: s.location, startTime: s.startTime, endTime: s.endTime },
      });
    }
  }
  const rank = { clash: 0, untimed: 1, sameDay: 2, sameVisit: 3 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.resourceName.localeCompare(b.resourceName));
}

export const isClash = (c: ResourceConflict) => c.severity === "clash";
export const clashKey = (c: ResourceConflict) => `${c.resourceId}:${c.shoot.id}`;
