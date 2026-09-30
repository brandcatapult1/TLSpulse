import { addDays, format, isValid, parse, startOfMonth, startOfWeek } from "date-fns";

// All dates are plain calendar days in IST; we never do timezone math.
export const ymd = (d: Date) => format(d, "yyyy-MM-dd");
export const parseYmd = (s: string) => parse(s, "yyyy-MM-dd", new Date());
export const isYmd = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && isValid(parseYmd(s));

/** Postgres DATE <-> "YYYY-MM-DD" without timezone drift. */
export const toDbDate = (s: string) => new Date(`${s}T00:00:00Z`);
export const fromDbDate = (d: Date) => d.toISOString().slice(0, 10);

export const monthKey = (d: Date) => format(d, "yyyy-MM");
export function parseMonth(m: string | null | undefined, fallback = new Date()): Date {
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    const d = parse(`${m}-01`, "yyyy-MM-dd", new Date());
    if (isValid(d)) return d;
  }
  return startOfMonth(fallback);
}

/** 6 Monday-first weeks covering the month, so the grid never changes height. */
export function monthGrid(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function gridRange(month: Date) {
  const days = monthGrid(month);
  return { from: ymd(days[0]), to: ymd(days[41]) };
}

export function monthRange(month: Date) {
  const first = startOfMonth(month);
  const next = new Date(first.getFullYear(), first.getMonth() + 1, 1);
  return { from: ymd(first), toExclusive: ymd(next) };
}

/** "10:00" → "11:00" (capped at 23:59). */
export function plusHour(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const mins = Math.min(h * 60 + m + 60, 23 * 60 + 59);
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function fmtTime(t: string | null | undefined): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function fmtTimeRange(start: string | null, end: string | null): string {
  if (!start) return "";
  return end ? `${fmtTime(start)} – ${fmtTime(end)}` : fmtTime(start);
}

// Display helpers never throw: an empty or half-typed date (e.g. while editing a form) renders as "".
const safeFormat = (s: string, pattern: string) => (isYmd(s) ? format(parseYmd(s), pattern) : "");
export const fmtDayMonth = (s: string) => safeFormat(s, "d MMMM");
export const fmtShort = (s: string) => safeFormat(s, "d MMM");
export const fmtLong = (s: string) => safeFormat(s, "d MMMM yyyy");
export const fmtWeekday = (s: string) => safeFormat(s, "EEEE, d MMMM");

/** Timed shoots by start, then untimed by brand, cancelled last (Handbook §8.6). */
export function sortShoots<T extends { startTime: string | null; brandName: string; status: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ca = a.status === "CANCELLED" ? 1 : 0;
    const cb = b.status === "CANCELLED" ? 1 : 0;
    if (ca !== cb) return ca - cb;
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime) || a.brandName.localeCompare(b.brandName);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return a.brandName.localeCompare(b.brandName);
  });
}
