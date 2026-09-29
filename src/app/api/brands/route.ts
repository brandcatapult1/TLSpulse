import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bad, readJson, uniqueError } from "@/lib/http";
import { BrandInput, firstError } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const g = await requireUser("brand.view");
  if (g.error) return g.error;
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  const brands = await db.brand.findMany({
    where: {
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { companyGroup: { contains: q, mode: "insensitive" } }] } : {}),
      ...(activeOnly ? { status: "ACTIVE" } : {}),
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ brands: brands.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const g = await requireUser("brand.create");
  if (g.error) return g.error.status === 403 ? NextResponse.json({ error: "Only an admin can add brands" }, { status: 403 }) : g.error;
  const parsed = BrandInput.safeParse(await readJson(req));
  if (!parsed.success) return bad(firstError(parsed.error));
  const existing = await db.brand.findFirst({ where: { name: { equals: parsed.data.name, mode: "insensitive" } } });
  if (existing) return bad(`${existing.name} already exists`, 409);
  try {
    const brand = await db.brand.create({ data: { name: parsed.data.name, companyGroup: parsed.data.companyGroup } });
    await writeAudit({ actorId: g.user.id, action: "BRAND_CREATED", entity: "brand", entityId: brand.id, summary: `${g.user.name} added brand ${brand.name}` });
    return NextResponse.json({ brand }, { status: 201 });
  } catch (e) {
    return uniqueError(e, "That brand");
  }
}
