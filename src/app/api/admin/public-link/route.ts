import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { getPublicToken, rotatePublicToken } from "@/lib/settings";

export async function GET() {
  const g = await requireAdmin();
  if (g.error) return g.error;
  return NextResponse.json({ token: await getPublicToken() });
}

export async function POST() {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const token = await rotatePublicToken();
  await writeAudit({ actorId: g.user.id, action: "PUBLIC_LINK_ROTATED", entity: "setting", entityId: "public_calendar_token", summary: `${g.user.name} regenerated the public calendar link` });
  return NextResponse.json({ token });
}
