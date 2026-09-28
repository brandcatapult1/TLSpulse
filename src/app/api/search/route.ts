import { Prisma } from "@prisma/client";
import { format, isValid, parse } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/dates";

// "18 sep", "18 september", "sep 18", "18/9" → a date in the current year.
function parseDateQuery(q: string): string | null {
  const year = new Date().getFullYear();
  for (const f of ["d MMM", "d MMMM", "MMM d", "MMMM d", "d/M", "d-M", "yyyy-MM-dd"]) {
    const d = parse(q, f, new Date(year, 0, 1));
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }
  return null;
}

type Hit = { id: string; score: number };

export async function GET(req: NextRequest) {
  const g = await requireUser("calendar.view");
  if (g.error) return g.error;
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ brands: [], resources: [], shoots: [] });
  const like = `%${q}%`;

  const [brandHits, resourceHits, locationHits] = await Promise.all([
    db.$queryRaw<Hit[]>(Prisma.sql`
      SELECT id, word_similarity(${q}, name) AS score FROM "Brand"
      WHERE name ILIKE ${like} OR word_similarity(${q}, name) > 0.4
      ORDER BY (name ILIKE ${like}) DESC, score DESC LIMIT 5`),
    db.$queryRaw<Hit[]>(Prisma.sql`
      SELECT id, word_similarity(${q}, name) AS score FROM "Resource"
      WHERE name ILIKE ${like} OR role ILIKE ${like} OR word_similarity(${q}, name) > 0.45
      ORDER BY (name ILIKE ${like}) DESC, score DESC LIMIT 5`),
    db.$queryRaw<Hit[]>(Prisma.sql`
      SELECT id, word_similarity(${q}, location) AS score FROM "Shoot"
      WHERE "deletedAt" IS NULL AND (location ILIKE ${like} OR word_similarity(${q}, location) > 0.45)
      ORDER BY score DESC LIMIT 10`),
  ]);

  const date = parseDateQuery(q);
  const brandIds = brandHits.map((b) => b.id);
  const shootWhere: Prisma.ShootWhereInput[] = [];
  if (brandIds.length) shootWhere.push({ brandId: { in: brandIds } });
  if (locationHits.length) shootWhere.push({ id: { in: locationHits.map((l) => l.id) } });
  if (date) shootWhere.push({ date: toDbDate(date) });

  const today = toDbDate(format(new Date(), "yyyy-MM-dd"));
  const [brands, resources, shoots] = await Promise.all([
    db.brand.findMany({ where: { id: { in: brandIds } }, select: { id: true, name: true, companyGroup: true, status: true } }),
    db.resource.findMany({ where: { id: { in: resourceHits.map((r) => r.id) } }, select: { id: true, name: true, role: true, team: { select: { name: true } } } }),
    shootWhere.length
      ? db.shoot.findMany({
          where: { deletedAt: null, OR: shootWhere },
          select: { id: true, date: true, shootType: true, status: true, startTime: true, brand: { select: { name: true } } },
          take: 60,
        })
      : Promise.resolve([]),
  ]);

  // Upcoming first (soonest), then past (most recent).
  const ranked = shoots
    .map((s) => ({ ...s, upcoming: s.date >= today }))
    .sort((a, b) => (a.upcoming !== b.upcoming ? (a.upcoming ? -1 : 1) : a.upcoming ? +a.date - +b.date : +b.date - +a.date))
    .slice(0, 12);

  const order = (ids: string[]) => (a: { id: string }, b: { id: string }) => ids.indexOf(a.id) - ids.indexOf(b.id);
  return NextResponse.json({
    brands: brands.sort(order(brandIds)),
    resources: resources.sort(order(resourceHits.map((r) => r.id))).map((r) => ({ id: r.id, name: r.name, role: r.role, teamName: r.team.name })),
    shoots: ranked.map((s) => ({ id: s.id, date: fromDbDate(s.date), brandName: s.brand.name, shootType: s.shootType, status: s.status, startTime: s.startTime })),
  });
}
