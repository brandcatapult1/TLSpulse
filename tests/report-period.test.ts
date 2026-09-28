import { describe, expect, it } from "vitest";
import { periodFor, periodFromParams, periodLabel, shiftPeriod } from "@/lib/report-period";

const params = (o: Record<string, string>) => (k: string) => o[k] ?? null;
const today = new Date(2026, 8, 28); // Mon 28 Sep 2026

describe("report periods", () => {
  it("defaults to the current month", () => {
    expect(periodFromParams(params({}), today)).toEqual({ view: "month", from: "2026-09-01", to: "2026-09-30" });
  });
  it("weeks run Monday to Sunday", () => {
    expect(periodFor("week", "2026-10-01")).toEqual({ view: "week", from: "2026-09-28", to: "2026-10-04" });
    expect(periodLabel(periodFor("week", "2026-10-01"))).toBe("28 Sep – 4 Oct 2026");
  });
  it("day and month labels", () => {
    expect(periodLabel(periodFor("day", "2026-09-18"))).toBe("Fri, 18 Sep 2026");
    expect(periodLabel(periodFor("month", "2026-09-18"))).toBe("September 2026");
  });
  it("custom range: swaps reversed dates, clamps to a year, shifts by its length", () => {
    expect(periodFromParams(params({ view: "range", from: "2026-09-20", to: "2026-09-10" }), today)).toMatchObject({ from: "2026-09-10", to: "2026-09-20" });
    expect(periodFromParams(params({ view: "range", from: "2026-01-01", to: "2029-01-01" }), today).to).toBe("2027-01-01");
    expect(shiftPeriod({ view: "range", from: "2026-09-10", to: "2026-09-20" }, 1)).toEqual({ view: "range", from: "2026-09-21", to: "2026-10-01" });
  });
  it("month shift crosses years; legacy ?month= still works", () => {
    expect(shiftPeriod(periodFor("month", "2026-12-05"), 1)).toMatchObject({ from: "2027-01-01", to: "2027-01-31" });
    expect(periodFromParams(params({ month: "2026-08" }), today)).toMatchObject({ from: "2026-08-01", to: "2026-08-31" });
  });
});
