import { describe, expect, it } from "vitest";
import { BrandInput, ResourceInput, ShootCreate, ShootPatch, TeamInput, UserCreate } from "@/lib/validators";

const shoot = { brandId: "b1", shootType: "SOCIAL_MEDIA", date: "2026-10-05", resourceIds: [] };
const ok = (r: { success: boolean }) => r.success;
const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message;

describe("shoot validation", () => {
  it("requires brand, type and a real date", () => {
    expect(ok(ShootCreate.safeParse(shoot))).toBe(true);
    expect(msg(ShootCreate.safeParse({ ...shoot, brandId: "" }))).toBe("Pick a brand");
    expect(ok(ShootCreate.safeParse({ ...shoot, shootType: "OTHER" }))).toBe(false);
    expect(msg(ShootCreate.safeParse({ ...shoot, date: "2026-02-30" }))).toBe("Pick a date");
  });
  it("checks times: end after start, and no end without a start", () => {
    expect(ok(ShootCreate.safeParse({ ...shoot, startTime: "10:00", endTime: "12:00" }))).toBe(true);
    expect(msg(ShootCreate.safeParse({ ...shoot, startTime: "12:00", endTime: "10:00" }))).toBe("End time must be after start time");
    expect(msg(ShootCreate.safeParse({ ...shoot, endTime: "12:00" }))).toBe("Add a start time, or clear the end time");
    expect(msg(ShootCreate.safeParse({ ...shoot, startTime: "25:00" }))).toBe("Use HH:MM");
    expect(ok(ShootPatch.safeParse({ endTime: "12:00", startTime: null }))).toBe(false);
  });
  it("accepts a tentative date hold", () => {
    expect(ok(ShootCreate.safeParse({ ...shoot, status: "DATE_HOLD" }))).toBe(true);
    expect(ok(ShootPatch.safeParse({ status: "DATE_HOLD" }))).toBe(true);
  });
  it("limits location length and pin coordinates", () => {
    expect(ok(ShootCreate.safeParse({ ...shoot, location: "x".repeat(201) }))).toBe(false);
    expect(ok(ShootCreate.safeParse({ ...shoot, locationLat: 91, locationLng: 77 }))).toBe(false);
  });
});

describe("master data validation", () => {
  it("brand name is required (spaces don't count)", () => {
    expect(msg(BrandInput.safeParse({ name: "   " }))).toBe("Brand name is required");
    expect(ok(BrandInput.safeParse({ name: "Taj" }))).toBe(true);
  });
  it("resource needs name, role and team; mobile/email must be valid if given", () => {
    const r = { name: "Rohit", role: "Photographer", teamId: "t1" };
    expect(ok(ResourceInput.safeParse(r))).toBe(true);
    expect(msg(ResourceInput.safeParse({ ...r, role: "" }))).toBe("Role is required");
    expect(msg(ResourceInput.safeParse({ ...r, teamId: "" }))).toBe("Pick a team");
    expect(msg(ResourceInput.safeParse({ ...r, phone: "12" }))).toBe("Enter a valid phone number");
    expect(msg(ResourceInput.safeParse({ ...r, email: "rohit@" }))).toBe("Enter a valid email");
    expect(ResourceInput.parse({ ...r, phone: "+91 98765-43210", email: " Rohit@X.com " })).toMatchObject({ phone: "9876543210", email: "rohit@x.com" });
  });
  it("team needs a name and Internal/External", () => {
    expect(msg(TeamInput.safeParse({ name: "Video" }))).toBe("Choose Internal or External");
    expect(ok(TeamInput.safeParse({ name: "Video", type: "INTERNAL" }))).toBe(true);
  });
  it("user needs a name and a valid email", () => {
    expect(msg(UserCreate.safeParse({ name: "", email: "a@b.co" }))).toBe("Name is required");
    expect(msg(UserCreate.safeParse({ name: "A", email: "nope" }))).toBe("Enter a valid email");
  });
});
