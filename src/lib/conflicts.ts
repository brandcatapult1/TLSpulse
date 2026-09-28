// Pure conflict rules (Handbook §8.1–8.2). Conflicts only ever warn; nothing here blocks a save.
import type { ResourceConflict } from "./types";

export type OtherShoot = {
  id: string;
  brandName: string;
  startTime: string | null;
  endTime: string | null;
  resources: { id: string; name: string }[];
};

/** Untimed shoots are treated as all-day, so they overlap anything on that date. */
export function timesOverlap(aStart: string | null, aEnd: string | null, bStart: string | null, bEnd: string | null) {
  if (!aStart || !bStart) return true;
  const aE = aEnd ?? "23:59";
  const bE = bEnd ?? "23:59";
  return aStart < bE && bStart < aE;
}

export function findResourceConflicts(
  target: { startTime: string | null; endTime: string | null; resourceIds: string[] },
  others: OtherShoot[],
): ResourceConflict[] {
  const wanted = new Set(target.resourceIds);
  const out: ResourceConflict[] = [];
  for (const s of others) {
    for (const r of s.resources) {
      if (!wanted.has(r.id)) continue;
      out.push({
        resourceId: r.id,
        resourceName: r.name,
        severity: timesOverlap(target.startTime, target.endTime, s.startTime, s.endTime) ? "overlap" : "sameDay",
        shoot: { id: s.id, brandName: s.brandName, startTime: s.startTime, endTime: s.endTime },
      });
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? a.resourceName.localeCompare(b.resourceName) : a.severity === "overlap" ? -1 : 1));
}
