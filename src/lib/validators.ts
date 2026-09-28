import { z } from "zod";
import { isYmd } from "./dates";

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")
  .nullish()
  .or(z.literal(""))
  .transform((v) => v || null);

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const shootFields = {
  brandId: z.string().min(1, "Pick a brand"),
  shootType: z.enum(["SOCIAL_MEDIA", "REAL_TIME_VISIT"]),
  date: z.string().refine(isYmd, "Pick a date"),
  startTime: time,
  endTime: time,
  location: optText(200),
  notes: optText(4000),
  resourceIds: z.array(z.string().min(1)).max(50),
  status: z.enum(["PLANNED", "RESCHEDULED", "CANCELLED"]),
};

function endAfterStart(v: { startTime?: string | null; endTime?: string | null }) {
  return !(v.startTime && v.endTime) || v.endTime > v.startTime;
}
const endMsg = { message: "End time must be after start time", path: ["endTime"] };

export const ShootCreate = z
  .object({ ...shootFields, resourceIds: shootFields.resourceIds.default([]), status: shootFields.status.optional() })
  .refine(endAfterStart, endMsg);

export const ShootPatch = z.object(shootFields).partial().refine(endAfterStart, endMsg);

export const ConflictCheck = z.object({
  date: z.string().refine(isYmd),
  brandId: z.string().nullish(),
  location: z.string().max(200).nullish(),
  shootType: z.enum(["SOCIAL_MEDIA", "REAL_TIME_VISIT"]).nullish(),
  startTime: time,
  endTime: time,
  resourceIds: z.array(z.string()).default([]),
  excludeShootId: z.string().nullish(),
});

export const BrandInput = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(120),
  companyGroup: optText(120),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const TeamInput = z.object({
  name: z.string().trim().min(1, "Team name is required").max(80),
  type: z.enum(["INTERNAL", "EXTERNAL"], { message: "Choose Internal or External" }),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const ResourceInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  role: z.string().trim().min(1, "Role is required").max(80),
  teamId: z.string().min(1, "Pick a team"),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const UserCreate = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export const UserPatch = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  resetPassword: z.boolean().optional(),
});

export function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Invalid input";
}
