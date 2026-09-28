import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Maps unique-constraint violations to a friendly 409. */
export function uniqueError(e: unknown, what: string) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return bad(`${what} already exists`, 409);
  throw e;
}

export async function readJson(req: Request) {
  return req.json().catch(() => null);
}
