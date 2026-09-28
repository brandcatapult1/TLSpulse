import { describe, expect, it } from "vitest";
import { findResourceConflicts, sameLocation, timesOverlap } from "@/lib/conflicts";

describe("timesOverlap", () => {
  it("needs both shoots to have a time", () => {
    expect(timesOverlap(null, null, "10:00", "12:00")).toBe(false);
    expect(timesOverlap("10:00", "12:00", null, null)).toBe(false);
  });
  it("detects overlap; touching edges are fine", () => {
    expect(timesOverlap("10:00", "14:00", "13:00", "15:00")).toBe(true);
    expect(timesOverlap("11:00", "12:00", "10:00", "14:00")).toBe(true);
    expect(timesOverlap("10:00", "14:00", "14:00", "16:00")).toBe(false);
  });
  it("treats a start without an end as one hour", () => {
    expect(timesOverlap("10:00", null, "10:30", "11:30")).toBe(true);
    expect(timesOverlap("10:00", null, "11:00", "12:00")).toBe(false);
    expect(timesOverlap("23:30", null, "23:45", null)).toBe(true);
  });
});

describe("findResourceConflicts", () => {
  const others = [
    { id: "a", brandId: "m", brandName: "Marriott", location: "Aerocity, New Delhi", startTime: "10:00", endTime: "14:00", resources: [{ id: "rohit", name: "Rohit" }] },
    { id: "b", brandId: "i", brandName: "ITC", location: null, startTime: "15:00", endTime: "16:00", resources: [{ id: "aman", name: "Aman" }] },
    { id: "c", brandId: "n", brandName: "Nykaa", location: null, startTime: null, endTime: null, resources: [{ id: "neha", name: "Neha" }] },
  ];
  it("only reports selected resources", () => {
    expect(findResourceConflicts({ startTime: "11:00", endTime: "13:00", resourceIds: ["karan"] }, others)).toEqual([]);
  });
  it("same person at overlapping times is a clash; the rest only warn", () => {
    const r = findResourceConflicts({ startTime: "11:00", endTime: "13:00", resourceIds: ["rohit", "aman", "neha"] }, others);
    expect(r.map((c) => [c.resourceName, c.severity])).toEqual([
      ["Rohit", "clash"],
      ["Neha", "untimed"],
      ["Aman", "sameDay"],
    ]);
  });
  it("a new shoot without a time never clashes", () => {
    const r = findResourceConflicts({ startTime: null, endTime: null, resourceIds: ["rohit"] }, others);
    expect(r.map((c) => c.severity)).toEqual(["untimed"]);
  });
  it("same brand at the same location may share crew at overlapping times", () => {
    const at = (brandId: string, location: string | null) =>
      findResourceConflicts({ startTime: "11:00", endTime: "13:00", resourceIds: ["rohit"], brandId, location }, others)[0].severity;
    expect(at("m", "aerocity  new delhi")).toBe("sameVisit");
    expect(at("m", "JW Marriott, Aerocity")).toBe("clash"); // same brand, different place
    expect(at("i", "Aerocity, New Delhi")).toBe("clash"); // same place, different brand
    expect(at("m", null)).toBe("clash"); // no location → can't tell it's the same visit
  });
});

describe("sameLocation", () => {
  it("ignores case, spaces and punctuation; empty never matches", () => {
    expect(sameLocation("Aerocity, New Delhi", "aerocity new-delhi")).toBe(true);
    expect(sameLocation("", "")).toBe(false);
    expect(sameLocation(null, null)).toBe(false);
  });
});
