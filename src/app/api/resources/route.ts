import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bad, readJson } from "@/lib/http";
import { currentMonthCounts } from "@/lib/month-counts";
import { firstError, ResourceInput } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const g = await requireUser("resource.view");
  if (g.error) return g.error;
  const activeOnly = req.nextUrl.searchParams.get("active") === "1";
  const [rows, counts] = await Promise.all([
    db.resource.findMany({
      where: activeOnly ? { status: "ACTIVE" } : {},
      include: { team: { select: { name: true, type: true } } },
      orderBy: [{ team: { name: "asc" } }, { name: "asc" }],
    }),
    currentMonthCounts(),
  ]);
  return NextResponse.json({
    resources: rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      teamId: r.teamId,
      teamName: r.team.name,
      teamType: r.team.type,
      status: r.status,
      shootsThisMonth: counts.resource.get(r.id) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const g = await requireUser("resource.write");
  if (g.error) return g.error;
  const parsed = ResourceInput.safeParse(await readJson(req));
  if (!parsed.success) return bad(firstError(parsed.error));
  const team = await db.team.findUnique({ where: { id: parsed.data.teamId } });
  if (!team) return bad("Team not found");
  const resource = await db.resource.create({ data: parsed.data });
  await writeAudit({ actorId: g.user.id, action: "RESOURCE_CREATED", entity: "resource", entityId: resource.id, summary: `${g.user.name} added ${resource.name} (${resource.role}) to ${team.name} (${team.type === "EXTERNAL" ? "External" : "Internal"})` });
  return NextResponse.json({ resource }, { status: 201 });
}
