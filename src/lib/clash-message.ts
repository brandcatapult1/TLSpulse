import { fmtDayMonth, fmtTimeRange } from "./dates";
import type { ResourceConflict } from "./types";

/** "Rohit is already booked on Marriott (10:00 AM – 2:00 PM) on 18 September." */
export function clashMessage(clashes: ResourceConflict[], date: string) {
  const parts = clashes.map((c) => `${c.resourceName} is already booked on ${c.shoot.brandName} (${fmtTimeRange(c.shoot.startTime, c.shoot.endTime)})`);
  return `${parts.join("; ")} on ${fmtDayMonth(date)}. Change the time or the crew.`;
}
