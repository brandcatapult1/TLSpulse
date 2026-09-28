// Report periods (Day / Week / Month / custom range). Pure and client-safe; weeks are Monday-first.
import { addDays, addMonths, addWeeks, differenceInCalendarDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { isYmd, parseYmd, ymd } from "./dates";

export type PeriodView = "day" | "week" | "month" | "range";
export type Period = { view: PeriodView; from: string; to: string }; // inclusive dates

export const MAX_RANGE_DAYS = 366;
const VIEWS: PeriodView[] = ["day", "week", "month", "range"];

/** Reads ?view=&date= (anchor) or ?from=&to= (range). Falls back to the current month. */
export function periodFromParams(get: (k: string) => string | null, today = new Date()): Period {
  const view = (VIEWS as string[]).includes(get("view") ?? "") ? (get("view") as PeriodView) : "month";
  if (view === "range") {
    const from = get("from");
    const to = get("to");
    if (isYmd(from) && isYmd(to)) {
      const [a, b] = from <= to ? [from, to] : [to, from];
      // Clamp very long ranges so a typo can't load years of data.
      const end = differenceInCalendarDays(parseYmd(b), parseYmd(a)) >= MAX_RANGE_DAYS ? ymd(addDays(parseYmd(a), MAX_RANGE_DAYS - 1)) : b;
      return { view, from: a, to: end };
    }
    return periodFor("month", ymd(today));
  }
  const date = get("date");
  // Back-compat with ?month=YYYY-MM links.
  const month = get("month");
  const anchor = isYmd(date) ? date : month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : ymd(today);
  return periodFor(view, anchor);
}

export function periodFor(view: Exclude<PeriodView, "range">, anchor: string): Period {
  const d = parseYmd(anchor);
  if (view === "day") return { view, from: anchor, to: anchor };
  if (view === "week") return { view, from: ymd(startOfWeek(d, { weekStartsOn: 1 })), to: ymd(endOfWeek(d, { weekStartsOn: 1 })) };
  return { view, from: ymd(startOfMonth(d)), to: ymd(endOfMonth(d)) };
}

/** Previous/next period of the same kind; a custom range shifts by its own length. */
export function shiftPeriod(p: Period, dir: 1 | -1): Period {
  const from = parseYmd(p.from);
  if (p.view === "day") return periodFor("day", ymd(addDays(from, dir)));
  if (p.view === "week") return periodFor("week", ymd(addWeeks(from, dir)));
  if (p.view === "month") return periodFor("month", ymd(addMonths(from, dir)));
  const len = differenceInCalendarDays(parseYmd(p.to), from) + 1;
  return { view: "range", from: ymd(addDays(from, dir * len)), to: ymd(addDays(parseYmd(p.to), dir * len)) };
}

export function periodLabel(p: Period): string {
  const a = parseYmd(p.from);
  const b = parseYmd(p.to);
  if (p.view === "day") return format(a, "EEE, d MMM yyyy");
  if (p.view === "month") return format(a, "MMMM yyyy");
  if (p.from === p.to) return format(a, "d MMM yyyy");
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();
  return `${format(a, sameMonth ? "d" : sameYear ? "d MMM" : "d MMM yyyy")} – ${format(b, "d MMM yyyy")}`;
}

/** Query string for the API and the URL. */
export function periodQuery(p: Period): URLSearchParams {
  return p.view === "range" ? new URLSearchParams({ view: "range", from: p.from, to: p.to }) : new URLSearchParams({ view: p.view, date: p.from });
}
