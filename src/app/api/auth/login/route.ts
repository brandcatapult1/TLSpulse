import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clearAttempts, tooManyAttempts } from "@/lib/rate-limit";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

const Body = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and password" }, { status: 400 });
  const { email, password } = parsed.data;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${email}`;
  if (tooManyAttempts(key)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = user && user.status === "ACTIVE" && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });

  clearAttempts(key);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = await signSession({ sub: user.id, role: user.role, name: user.name, mustChangePw: user.mustChangePw });
  const res = NextResponse.json({ ok: true, mustChangePw: user.mustChangePw });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
