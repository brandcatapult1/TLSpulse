import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { bad, readJson } from "@/lib/http";
import { isPublicCalendarEnabled, PUBLIC_CALENDAR_PATH, setPublicCalendarEnabled } from "@/lib/settings";

export async function GET() {
  const g = await requireAdmin();
  if (g.error) return g.error;
  return NextResponse.json({ path: PUBLIC_CALENDAR_PATH, enabled: await isPublicCalendarEnabled() });
}

export async function POST(req: NextRequest) {
  const g = await requireAdmin();
  if (g.error) return g.error;
  const parsed = z.object({ enabled: z.boolean() }).safeParse(await readJson(req));
  if (!parsed.success) return bad("Send { enabled: true | false }");
  await setPublicCalendarEnabled(parsed.data.enabled);
  await writeAudit({
    actorId: g.user.id,
    action: "PUBLIC_CALENDAR_TOGGLED",
    entity: "setting",
    entityId: "public_calendar_enabled",
    summary: `${g.user.name} turned public calendar sharing ${parsed.data.enabled ? "on" : "off"}`,
  });
  return NextResponse.json({ path: PUBLIC_CALENDAR_PATH, enabled: parsed.data.enabled });
}
