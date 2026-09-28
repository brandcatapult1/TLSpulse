import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const g = await requireUser();
  if (g.error) return g.error;
  return NextResponse.json({ user: g.user });
}
