import { prisma } from "@/server/db/client";
import type { CurrentUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds, getAccessibleContext } from "./access";
import { getExpiringLeases } from "./lease";
import { recomputeOverdueObligations, getCollectionRate } from "./payments";
import { calculateManagementFeeMinor } from "./managementFee";

export type DashboardPeriod = "today" | "month" | "quarter" | "year" | "custom";

export function resolvePeriodRange(period: DashboardPeriod, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
    }
    case "quarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return { start: new Date(now.getFullYear(), quarterStartMonth, 1), end: new Date(now.getFullYear(), quarterStartMonth + 3, 1) };
    }
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
    case "custom":
      return { start: customStart ?? now, end: customEnd ?? now };
    case "month":
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
}

/** One aggregation pass for the /dashboard/tenants KPI strip — deliberately a small, fixed set of numbers rather than every metric that could be shown, per "do not overcrowd the dashboard." */
export async function getDashboardKpis(actor: CurrentUser, period: DashboardPeriod = "month", customStart?: Date, customEnd?: Date) {
  const propertyIds = await getAuthorizedPropertyIds(actor);
  const ctx = await getAccessibleContext(actor);
  await recomputeOverdueObligations();

  const unitWhere = propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } };
  const leaseUnitWhere = propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } };

  const { start: periodStart, end: periodEnd } = resolvePeriodRange(period, customStart, customEnd);

  const [
    totalProperties,
    totalUnits,
    occupiedUnits,
    activeTenants,
    activeLeases,
    obligationsThisPeriod,
    paymentsThisPeriod,
    outstandingAgg,
    overdueCount,
    openMaintenanceCount,
    recentPayments,
    expiring30,
    expiring60,
    expiring90,
    collection,
    settlementsDueAgg,
    paidPaymentsForFee,
  ] = await Promise.all([
    prisma.managedProperty.count({ where: propertyIds === "all" ? undefined : { id: { in: propertyIds } } }),
    prisma.rentalUnit.count({ where: unitWhere }),
    prisma.rentalUnit.count({ where: { ...unitWhere, status: "OCCUPIED" } }),
    prisma.tenant.count({ where: { status: "ACTIVE", unit: unitWhere } }),
    prisma.lease.count({ where: { status: "ACTIVE", unit: leaseUnitWhere } }),
    prisma.rentObligation.aggregate({
      _sum: { amountDueMinor: true },
      where: { dueDate: { gte: periodStart, lt: periodEnd }, lease: { unit: leaseUnitWhere } },
    }),
    prisma.rentPayment.aggregate({
      _sum: { amountMinor: true },
      where: { paidAt: { gte: periodStart, lt: periodEnd }, status: "COMPLETED", lease: { unit: leaseUnitWhere } },
    }),
    prisma.rentObligation.aggregate({
      _sum: { amountDueMinor: true, amountPaidMinor: true },
      where: { status: { in: ["DUE", "OVERDUE", "PARTIALLY_PAID"] }, lease: { unit: leaseUnitWhere } },
    }),
    prisma.rentObligation.count({ where: { status: "OVERDUE", lease: { unit: leaseUnitWhere } } }),
    prisma.maintenanceRequest.count({
      where: { status: { notIn: ["COMPLETED", "CLOSED"] }, propertyId: propertyIds === "all" ? undefined : { in: propertyIds } },
    }),
    prisma.rentPayment.findMany({
      where: { lease: { unit: leaseUnitWhere }, status: "COMPLETED" },
      include: { tenant: true, lease: { include: { unit: { include: { property: true } } } } },
      orderBy: { paidAt: "desc" },
      take: 5,
    }),
    getExpiringLeases(propertyIds, 30),
    getExpiringLeases(propertyIds, 60),
    getExpiringLeases(propertyIds, 90),
    getCollectionRate(propertyIds, periodStart, periodEnd),
    prisma.landlordSettlement.aggregate({
      _sum: { netAmountMinor: true },
      where: {
        status: { in: ["PENDING", "APPROVED"] },
        // A settlement generated for "all properties" has propertyId: null,
        // so it's attributed by ownerId instead — a plain
        // `propertyId: { in: propertyIds }` filter would silently exclude
        // every portfolio-wide settlement for a landlord who owns those
        // properties. Platform admins (propertyIds === "all") see every
        // settlement with no filter at all.
        ...(propertyIds === "all"
          ? {}
          : { OR: [{ propertyId: { in: propertyIds } }, ...(ctx.ownerId ? [{ propertyId: null, ownerId: ctx.ownerId }] : [])] }),
      },
    }),
    prisma.rentPayment.findMany({
      where: { paidAt: { gte: periodStart, lt: periodEnd }, status: "COMPLETED", lease: { unit: leaseUnitWhere } },
      select: { amountMinor: true, lease: { select: { unit: { select: { propertyId: true } } } } },
    }),
  ]);

  const totalVacant = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const outstandingMinor = (outstandingAgg._sum.amountDueMinor ?? 0) - (outstandingAgg._sum.amountPaidMinor ?? 0);

  // Management fees earned this period — computed per property against
  // that property's own agreement, same rule as the landlord statement.
  const grossByProperty = new Map<string, number>();
  for (const p of paidPaymentsForFee) {
    const pid = p.lease.unit.propertyId;
    grossByProperty.set(pid, (grossByProperty.get(pid) ?? 0) + p.amountMinor);
  }
  const propertyIdsForFee = Array.from(grossByProperty.keys());
  const agreements = propertyIdsForFee.length
    ? await prisma.managementAgreement.findMany({ where: { propertyId: { in: propertyIdsForFee } } })
    : [];
  const agreementByProperty = new Map(agreements.map((a) => [a.propertyId, a]));
  const managementFeesEarnedMinor = Array.from(grossByProperty.entries()).reduce(
    (sum, [pid, gross]) => sum + calculateManagementFeeMinor(agreementByProperty.get(pid) ?? null, gross),
    0,
  );

  return {
    period,
    periodStart,
    periodEnd,
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits: totalVacant,
    occupancyRate,
    activeTenants,
    activeLeases,
    leasesExpiring30: expiring30.length,
    leasesExpiring60: expiring60.length,
    leasesExpiring90: expiring90.length,
    rentExpectedThisMonthMinor: obligationsThisPeriod._sum.amountDueMinor ?? 0,
    rentCollectedThisMonthMinor: paymentsThisPeriod._sum.amountMinor ?? 0,
    collectionRate: collection.rate,
    outstandingRentMinor: Math.max(outstandingMinor, 0),
    overdueObligationCount: overdueCount,
    openMaintenanceCount,
    managementFeesEarnedMinor,
    landlordSettlementsDueMinor: settlementsDueAgg._sum.netAmountMinor ?? 0,
    recentPayments,
    expiringLeases: { in30: expiring30, in60: expiring60, in90: expiring90 },
  };
}
