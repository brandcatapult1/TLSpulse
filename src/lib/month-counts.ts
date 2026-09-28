import { db } from "./db";
import { monthRange, toDbDate } from "./dates";

/** Live (non-cancelled) shoot counts for the current month, keyed by brand and by resource. */
export async function currentMonthCounts() {
  const { from, toExclusive } = monthRange(new Date());
  const where = { date: { gte: toDbDate(from), lt: toDbDate(toExclusive) }, deletedAt: null, status: { not: "CANCELLED" as const } };
  const [byBrand, byResource] = await Promise.all([
    db.shoot.groupBy({ by: ["brandId"], where, _count: true }),
    db.shootAssignment.groupBy({ by: ["resourceId"], where: { shoot: where }, _count: true }),
  ]);
  return {
    brand: new Map(byBrand.map((b) => [b.brandId, b._count])),
    resource: new Map(byResource.map((r) => [r.resourceId, r._count])),
  };
}
