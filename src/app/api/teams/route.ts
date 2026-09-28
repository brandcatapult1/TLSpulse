import { NextResponse, type NextRequest } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bad, readJson, uniqueError } from "@/lib/http";
import { firstError, TeamInput } from "@/lib/validators";

export async function GET() {
  const g = await requireUser("team.view");
  if (g.error) return g.error;
  const teams = await db.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { resources: { where: { status: "ACTIVE" } } } } },
  });
  return NextResponse.json({ teams: teams.map(({ _count, ...t }) => ({ ...t, memberCount: _count.resources })) });
}

export async function POST(req: NextRequest) {
  const g = await requireUser("team.write");
  if (g.error) return g.error;
  const parsed = TeamInput.safeParse(await readJson(req));
  if (!parsed.success) return bad(firstError(parsed.error));
  try {
    const team = await db.team.create({ data: { name: parsed.data.name, type: parsed.data.type } });
    await writeAudit({ actorId: g.user.id, action: "TEAM_CREATED", entity: "team", entityId: team.id, summary: `${g.user.name} added ${team.type === "EXTERNAL" ? "external" : "internal"} team ${team.name}` });
    return NextResponse.json({ team }, { status: 201 });
  } catch (e) {
    return uniqueError(e, "That team");
  }
}
