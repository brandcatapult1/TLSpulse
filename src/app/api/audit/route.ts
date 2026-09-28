import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const entityId = req.nextUrl.searchParams.get("entityId") ?? undefined;
  const before = req.nextUrl.searchParams.get("before");
  const rows = await db.auditLog.findMany({
    where: { ...(entityId ? { entityId } : {}), ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ entries: rows.map((r) => ({ id: r.id, summary: r.summary, action: r.action, entity: r.entity, entityId: r.entityId, at: r.createdAt })) });
}
