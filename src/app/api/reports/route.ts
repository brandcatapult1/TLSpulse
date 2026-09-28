import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadPeriod, readFilters } from "@/lib/report-data";
import { buildReport } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const g = await requireUser("report.view");
  if (g.error) return g.error;
  const { period, filters } = readFilters(req);
  return NextResponse.json({ period, ...buildReport(await loadPeriod(period.from, period.to), filters) });
}
