import { db } from "./db";
import { monthRange, toDbDate } from "./dates";

/** Live (non-cancelled) assignment counts for the current month, keyed by resource. */
export async function currentMonthCounts() {
  const { from, toExclusive } = monthRange(new Date());
  const where = { date: { gte: toDbDate(from), lt: toDbDate(toExclusive) }, deletedAt: null, status: { not: "CANCELLED" as const } };
  const byResource = await db.shootAssignment.groupBy({ by: ["resourceId"], where: { shoot: where }, _count: true });
  return { resource: new Map(byResource.map((r) => [r.resourceId, r._count])) };
}
