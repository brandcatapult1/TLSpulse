import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { checkConflicts } from "@/lib/shoots";
import { ConflictCheck } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const g = await requireUser("shoot.edit");
  if (g.error) return g.error;
  const parsed = ConflictCheck.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid conflict check" }, { status: 400 });
  return NextResponse.json(await checkConflicts(parsed.data));
}
