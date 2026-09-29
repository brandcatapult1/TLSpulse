// The /crew schedule link: a crew member enters their mobile or email and gets a
// separate, view-only cookie scoped to their own resource. It is not a login and
// gives no access to the rest of the app.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { fromDbDate, sortShoots, toDbDate } from "./dates";
import type { ShootDTO } from "./types";

export const CREW_VIEW_COOKIE = "tlsp_crew";
const MAX_AGE = 60 * 60 * 24 * 7; // a week, then they enter their number again

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function signCrewView(resourceId: string) {
  return new SignJWT({ kind: "crew-view" }).setProtectedHeader({ alg: "HS256" }).setSubject(resourceId).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
}

export const crewViewCookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE };

/** The active resource this browser was verified for, or null. */
export async function currentCrewViewer() {
  const token = (await cookies()).get(CREW_VIEW_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "crew-view" || !payload.sub) return null;
    return db.resource.findFirst({ where: { id: payload.sub, status: "ACTIVE" }, select: { id: true, name: true, role: true, team: { select: { name: true } } } });
  } catch {
    return null;
  }
}

/** Only this person's shoots, with public fields (no internal notes, no IDs of anything else). */
export async function listCrewShoots(resourceId: string, from: string, to: string): Promise<ShootDTO[]> {
  const rows = await db.shoot.findMany({
    where: { date: { gte: toDbDate(from), lte: toDbDate(to) }, deletedAt: null, assignments: { some: { resourceId } } },
    select: {
      id: true,
      shootType: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      locationLat: true,
      locationLng: true,
      locationPlaceId: true,
      status: true,
      brand: { select: { name: true } },
      assignments: { select: { resource: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  return sortShoots(
    rows.map((s, i) => ({
      id: `c${i}`,
      brandId: "",
      brandName: s.brand.name,
      shootType: s.shootType,
      date: fromDbDate(s.date),
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      locationLat: s.locationLat,
      locationLng: s.locationLng,
      locationPlaceId: s.locationPlaceId,
      status: s.status,
      resources: s.assignments.map((a, j) => ({ id: a.resource.id === resourceId ? "me" : `c${i}-${j}`, name: a.resource.id === resourceId ? `${a.resource.name} (you)` : a.resource.name, role: a.resource.role, teamName: "" })),
    })),
  );
}
