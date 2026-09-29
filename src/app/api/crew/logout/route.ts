import { NextResponse } from "next/server";
import { CREW_VIEW_COOKIE, crewViewCookie } from "@/lib/crew-view";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CREW_VIEW_COOKIE, "", { ...crewViewCookie, maxAge: 0 });
  return res;
}
