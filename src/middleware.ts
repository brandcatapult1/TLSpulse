import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Public: login, the read-only public calendar, and the login/logout APIs.
const PUBLIC_PREFIXES = ["/login", "/bookings", "/crew", "/api/crew/", "/p/", "/api/auth/login", "/api/auth/logout"];
// Signed-in but still allowed while a password change is pending.
const PW_CHANGE_ALLOWED = ["/change-password", "/api/auth/password", "/api/auth/logout"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (!claims) {
    if (isApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (claims.mustChangePw && !PW_CHANGE_ALLOWED.some((p) => pathname.startsWith(p))) {
    if (isApi) return NextResponse.json({ error: "Password change required" }, { status: 403 });
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico|webmanifest)$).*)"],
};
