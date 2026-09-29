// Single source of truth for who can do what (Handbook §7).
// UI may hide controls using this, but every API route must also check it.
import type { Role } from "./session";

// Crew (a resource's own login) is view-only, and every query is scoped to their shoots.
const CREW = ["calendar.view", "shoot.view", "report.view"] as const;

const USER = [
  ...CREW,
  "shoot.create",
  "shoot.edit",
  "shoot.cancel",
  "shoot.assign",
  "brand.view",
  "brand.edit",
  "resource.view",
  "team.view",
] as const;

const ADMIN = [
  ...USER,
  "shoot.delete",
  "brand.create", // Users pick existing brands only (decided 28 Sep 2026)
  "brand.deactivate",
  "resource.write",
  "team.write",
  "user.manage",
  "settings.manage",
  "audit.view",
] as const;

export type Action = (typeof ADMIN)[number];

const ALLOWED: Record<Role, ReadonlySet<string>> = { CREW: new Set(CREW), USER: new Set(USER), ADMIN: new Set(ADMIN) };

export function can(role: Role, action: Action): boolean {
  return ALLOWED[role].has(action);
}

/** Sections shown in the sidebar for each role. */
export const canSeeMasters = (role: Role) => role !== "CREW";
