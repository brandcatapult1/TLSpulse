import { describe, expect, it } from "vitest";
import { buildReport, resourceDrilldown, type ReportShoot } from "@/lib/reports";

const photo = { teamId: "t1", teamName: "Photography", teamType: "INTERNAL" as const };
const video = { teamId: "t2", teamName: "Video", teamType: "EXTERNAL" as const };
const rohit = { id: "rohit", name: "Rohit", role: "Photographer", ...photo };
const aman = { id: "aman", name: "Aman", role: "Videographer", ...video };

const shoots: ReportShoot[] = [
  { id: "1", date: "2026-09-02", brandId: "m", brandName: "Marriott", shootType: "SOCIAL_MEDIA", status: "PLANNED", resources: [rohit, aman] },
  { id: "2", date: "2026-09-03", brandId: "i", brandName: "ITC", shootType: "REAL_TIME_VISIT", status: "RESCHEDULED", resources: [rohit] },
  { id: "3", date: "2026-09-04", brandId: "m", brandName: "Marriott", shootType: "SOCIAL_MEDIA", status: "CANCELLED", resources: [rohit] },
  { id: "4", date: "2026-09-05", brandId: "n", brandName: "Nykaa", shootType: "SOCIAL_MEDIA", status: "PLANNED", resources: [] },
];

describe("buildReport", () => {
  it("excludes cancelled shoots everywhere except the Cancelled tile", () => {
    const r = buildReport(shoots, {});
    expect(r.overview).toMatchObject({ total: 3, social: 2, realtime: 1, cancelled: 1, resourcesUsed: 2, unassigned: 1 });
    expect(r.byResource.find((x) => x.id === "rohit")).toMatchObject({ total: 2, social: 1, realtime: 1 });
    expect(r.byBrand.find((b) => b.id === "m")?.total).toBe(1);
  });
  it("counts team allocation as assignments", () => {
    const r = buildReport(shoots, {});
    expect(r.byTeam).toEqual([
      { id: "t1", name: "Photography", type: "INTERNAL", assignments: 2, shoots: 2 },
      { id: "t2", name: "Video", type: "EXTERNAL", assignments: 1, shoots: 1 },
    ]);
  });
  it("status filter can ask for cancelled explicitly", () => {
    expect(buildReport(shoots, { status: "CANCELLED" }).overview.total).toBe(1);
  });
  it("team filter only counts that team's assignments", () => {
    const r = buildReport(shoots, { teamId: "t2" });
    expect(r.overview.total).toBe(1);
    expect(r.byResource.map((x) => x.id)).toEqual(["aman"]);
  });
});

describe("resourceDrilldown", () => {
  it("lists a person's non-cancelled shoots by date", () => {
    const d = resourceDrilldown(shoots, "rohit", {});
    expect(d).toMatchObject({ total: 2, social: 1, realtime: 1 });
    expect(d.shoots.map((s) => s.id)).toEqual(["1", "2"]);
  });
});
