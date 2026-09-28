import { describe, expect, it } from "vitest";
import { findResourceConflicts, timesOverlap } from "@/lib/conflicts";

describe("timesOverlap", () => {
  it("treats untimed shoots as all-day", () => {
    expect(timesOverlap(null, null, "10:00", "12:00")).toBe(true);
    expect(timesOverlap("10:00", "12:00", null, null)).toBe(true);
  });
  it("detects overlap and touching edges", () => {
    expect(timesOverlap("10:00", "14:00", "13:00", "15:00")).toBe(true);
    expect(timesOverlap("10:00", "14:00", "14:00", "16:00")).toBe(false);
    expect(timesOverlap("10:00", null, "18:00", "19:00")).toBe(true); // open-ended runs to end of day
  });
});

describe("findResourceConflicts", () => {
  const others = [
    { id: "a", brandName: "ITC", startTime: "14:00", endTime: "16:00", resources: [{ id: "rohit", name: "Rohit" }] },
    { id: "b", brandName: "ABC", startTime: null, endTime: null, resources: [{ id: "neha", name: "Neha" }] },
  ];
  it("only reports selected resources", () => {
    expect(findResourceConflicts({ startTime: "10:00", endTime: "12:00", resourceIds: ["aman"] }, others)).toEqual([]);
  });
  it("grades severity: overlap vs same day", () => {
    const r = findResourceConflicts({ startTime: "10:00", endTime: "12:00", resourceIds: ["rohit", "neha"] }, others);
    expect(r.map((c) => [c.resourceName, c.severity])).toEqual([
      ["Neha", "overlap"],
      ["Rohit", "sameDay"],
    ]);
  });
});
