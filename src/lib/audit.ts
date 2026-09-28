import type { Prisma } from "@prisma/client";
import { db } from "./db";

export async function writeAudit(entry: {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  diff?: Prisma.InputJsonValue;
}) {
  await db.auditLog.create({ data: entry });
}
