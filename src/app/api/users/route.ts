// Full user management (create/role/block/reset) lands in M4; listing is here so the
// admin-only guard is exercised from M1.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const users = await db.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true },
  });
  return NextResponse.json({ users });
}
