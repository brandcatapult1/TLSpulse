// Single source of truth for Admin vs User rights (Handbook §7).
// UI may hide controls using this, but every API route must also check it.
import type { Role } from "./session";

const ADMIN_ONLY = new Set([
  "shoot.delete",
  "brand.deactivate",
  "brand.delete",
  "resource.write",
  "team.write",
  "user.manage",
  "settings.manage",
  "audit.view",
] as const);

const EVERYONE = new Set([
  "calendar.view",
  "shoot.view",
  "shoot.create",
  "shoot.edit",
  "shoot.cancel",
  "shoot.assign",
  "brand.view",
  "brand.create",
  "brand.edit",
  "resource.view",
  "team.view",
  "report.view",
] as const);

export type Action =
  | (typeof ADMIN_ONLY extends Set<infer T> ? T : never)
  | (typeof EVERYONE extends Set<infer T> ? T : never);

export function can(role: Role, action: Action): boolean {
  if (EVERYONE.has(action as never)) return true;
  if (ADMIN_ONLY.has(action as never)) return role === "ADMIN";
  return false;
}
