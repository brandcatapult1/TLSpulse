import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { normalizeEmail, normalizePhone } from "@/lib/contact";
import { CREW_VIEW_COOKIE, crewViewCookie, signCrewView } from "@/lib/crew-view";
import { db } from "@/lib/db";
import { tooManyAttempts } from "@/lib/rate-limit";

const NOT_FOUND = "We couldn't find a crew member with that mobile number or email. Check it, or ask the TLS team to add it to your profile.";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  // Slows down anyone trying to guess numbers.
  if (tooManyAttempts(`crew:${ip}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  }
  const parsed = z.object({ contact: z.string().trim().min(3).max(120) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your mobile number or email" }, { status: 400 });

  const raw = parsed.data.contact;
  const email = raw.includes("@") ? normalizeEmail(raw) : null;
  const phone = email ? null : normalizePhone(raw);
  if (!email && !phone) return NextResponse.json({ error: "Enter a valid mobile number or email" }, { status: 400 });

  const resource = await db.resource.findFirst({ where: { status: "ACTIVE", ...(email ? { email } : { phone: phone! }) }, select: { id: true, name: true } });
  if (!resource) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

  const res = NextResponse.json({ ok: true, name: resource.name });
  res.cookies.set(CREW_VIEW_COOKIE, await signCrewView(resource.id), crewViewCookie);
  return res;
}
