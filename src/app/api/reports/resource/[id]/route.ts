import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadPeriod, readFilters } from "@/lib/report-data";
import { resourceDrilldown } from "@/lib/reports";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser("report.view");
  if (g.error) return g.error;
  const { id } = await params;
  if (g.user.role === "CREW" && id !== g.user.resourceId) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const resource = await db.resource.findUnique({ where: { id }, include: { team: { select: { name: true } } } });
  if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  const { period, filters } = readFilters(req);
  return NextResponse.json({
    period,
    resource: { id: resource.id, name: resource.name, role: resource.role, teamName: resource.team.name },
    ...resourceDrilldown(await loadPeriod(period.from, period.to), id, filters),
  });
}
