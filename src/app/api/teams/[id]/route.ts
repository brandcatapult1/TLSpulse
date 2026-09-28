import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bad, readJson, uniqueError } from "@/lib/http";
import { firstError, TeamInput } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser("team.write");
  if (g.error) return g.error;
  const { id } = await params;
  const parsed = TeamInput.partial().safeParse(await readJson(req));
  if (!parsed.success) return bad(firstError(parsed.error));
  try {
    const team = await db.team.update({ where: { id }, data: parsed.data });
    await writeAudit({ actorId: g.user.id, action: "TEAM_UPDATED", entity: "team", entityId: id, summary: `${g.user.name} updated team ${team.name}` });
    return NextResponse.json({ team });
  } catch (e) {
    return uniqueError(e, "A team with that name");
  }
}
