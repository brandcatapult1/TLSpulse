import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadPeriod, readFilters } from "@/lib/report-data";
import { teamDrilldown } from "@/lib/reports";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser("team.view");
  if (g.error) return g.error;
  const { id } = await params;
  const team = await db.team.findUnique({ where: { id }, select: { id: true, name: true, type: true } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  const { period, filters } = readFilters(req);
  return NextResponse.json({ period, team, ...teamDrilldown(await loadPeriod(period.from, period.to), id, filters) });
}
