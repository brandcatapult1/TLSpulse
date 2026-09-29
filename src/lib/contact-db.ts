import { db } from "./db";

/** Returns a message if another resource already uses this email or phone. */
export async function contactTaken(email: string | null | undefined, phone: string | null | undefined, exceptId?: string) {
  const or = [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])];
  if (!or.length) return null;
  const other = await db.resource.findFirst({ where: { OR: or, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { name: true, email: true, phone: true } });
  if (!other) return null;
  return other.email && other.email === email ? `${other.name} already uses this email` : `${other.name} already uses this phone number`;
}
