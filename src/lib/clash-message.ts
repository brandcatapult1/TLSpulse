import { fmtDayMonth, fmtTimeRange } from "./dates";
import type { ResourceConflict } from "./types";

export const CLASH_REASON: Record<NonNullable<ResourceConflict["reason"]>, string> = {
  differentBrand: "different brand",
  sameType: "same shoot type — only a Social Media Shoot + Real Time Visit pair can share crew",
  differentLocation: "same brand, different location",
  noLocation: "location missing — add the same location to both if it's one visit",
};

/** "Marriott at Aerocity, New Delhi" */
export const shootPlace = (c: ResourceConflict) => (c.shoot.location ? `${c.shoot.brandName} at ${c.shoot.location}` : c.shoot.brandName);

/** Server-side 409 message, e.g. "Rohit is already booked on Marriott at Aerocity (10:00 AM – 2:00 PM; different brand) on 18 September. …" */
export function clashMessage(clashes: ResourceConflict[], date: string) {
  const parts = clashes.map(
    (c) => `${c.resourceName} is already booked on ${shootPlace(c)} (${fmtTimeRange(c.shoot.startTime, c.shoot.endTime)}${c.reason ? `; ${CLASH_REASON[c.reason]}` : ""})`,
  );
  return `${parts.join("; ")} on ${fmtDayMonth(date)}. Crew can only overlap for the same brand, at the same location, on the other shoot type — change the time or the crew.`;
}
