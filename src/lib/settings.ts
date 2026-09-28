import { db } from "./db";

// The public calendar lives at a fixed address (/bookings). Admins can switch sharing off.
export const PUBLIC_CALENDAR_PATH = "/bookings";
const ENABLED_KEY = "public_calendar_enabled";

export async function isPublicCalendarEnabled(): Promise<boolean> {
  const s = await db.setting.findUnique({ where: { key: ENABLED_KEY } });
  return s?.value !== "0"; // on unless an admin turned it off
}

export async function setPublicCalendarEnabled(enabled: boolean) {
  const value = enabled ? "1" : "0";
  await db.setting.upsert({ where: { key: ENABLED_KEY }, create: { key: ENABLED_KEY, value }, update: { value } });
}
