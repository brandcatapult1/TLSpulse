import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadPeriod, readFilters } from "@/lib/report-data";
import { buildReport } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const g = await requireUser("report.view");
  if (g.error) return g.error;
  const { period, filters } = readFilters(req);
  // Crew only ever see their own numbers.
  const scoped = g.user.role === "CREW" ? { ...filters, resourceId: g.user.resourceId ?? "__none__", teamId: undefined, brandId: filters.brandId } : filters;
  return NextResponse.json({ period, ...buildReport(await loadPeriod(period.from, period.to), scoped) });
}
