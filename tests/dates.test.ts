import { describe, expect, it } from "vitest";
import { fmtTime, fmtTimeRange, fromDbDate, monthGrid, sortShoots, toDbDate, ymd } from "@/lib/dates";

describe("monthGrid", () => {
  it("always has 6 Monday-first weeks", () => {
    const days = monthGrid(new Date(2026, 8, 1)); // Sep 2026 starts on a Tuesday
    expect(days).toHaveLength(42);
    expect(ymd(days[0])).toBe("2026-08-31");
    expect(days[0].getDay()).toBe(1);
  });
});

describe("dates", () => {
  it("round-trips DB dates without drifting a day", () => {
    expect(fromDbDate(toDbDate("2026-09-18"))).toBe("2026-09-18");
  });
  it("formats 12-hour times", () => {
    expect(fmtTime("00:30")).toBe("12:30 AM");
    expect(fmtTime("14:00")).toBe("2:00 PM");
    expect(fmtTimeRange("10:00", "14:00")).toBe("10:00 AM – 2:00 PM");
  });
  it("orders timed first, untimed by brand, cancelled last", () => {
    const s = (brandName: string, startTime: string | null, status = "PLANNED") => ({ brandName, startTime, status });
    const out = sortShoots([s("ABC", null), s("Zed", "18:00"), s("ITC", "10:00", "CANCELLED"), s("Marriott", "10:00"), s("Aura", null)]);
    expect(out.map((x) => x.brandName)).toEqual(["Marriott", "Zed", "ABC", "Aura", "ITC"]);
  });
});
