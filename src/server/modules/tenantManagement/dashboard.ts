import { prisma } from "@/server/db/client";
import type { CurrentUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "./access";
import { getExpiringLeases } from "./lease";
import { recomputeOverdueObligations } from "./payments";

/** One aggregation pass for the /dashboard/tenants KPI strip — deliberately a small, fixed set of numbers rather than every metric that could be shown, per "do not overcrowd the dashboard." */
export async function getDashboardKpis(actor: CurrentUser) {
  const propertyIds = await getAuthorizedPropertyIds(actor);
  await recomputeOverdueObligations();

  const unitWhere = propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } };
  const leaseUnitWhere = propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    totalProperties,
    totalUnits,
    occupiedUnits,
    activeTenants,
    activeLeases,
    obligationsThisMonth,
    paymentsThisMonth,
    outstandingAgg,
    overdueCount,
    openMaintenanceCount,
    recentPayments,
    expiring30,
    expiring60,
    expiring90,
  ] = await Promise.all([
    prisma.managedProperty.count({ where: propertyIds === "all" ? undefined : { id: { in: propertyIds } } }),
    prisma.rentalUnit.count({ where: unitWhere }),
    prisma.rentalUnit.count({ where: { ...unitWhere, status: "OCCUPIED" } }),
    prisma.tenant.count({ where: { status: "ACTIVE", unit: unitWhere } }),
    prisma.lease.count({ where: { status: "ACTIVE", unit: leaseUnitWhere } }),
    prisma.rentObligation.aggregate({
      _sum: { amountDueMinor: true },
      where: { dueDate: { gte: monthStart, lt: monthEnd }, lease: { unit: leaseUnitWhere } },
    }),
    prisma.rentPayment.aggregate({
      _sum: { amountMinor: true },
      where: { paidAt: { gte: monthStart, lt: monthEnd }, lease: { unit: leaseUnitWhere } },
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
      where: { lease: { unit: leaseUnitWhere } },
      include: { tenant: true, lease: { include: { unit: { include: { property: true } } } } },
      orderBy: { paidAt: "desc" },
      take: 5,
    }),
    getExpiringLeases(propertyIds, 30),
    getExpiringLeases(propertyIds, 60),
    getExpiringLeases(propertyIds, 90),
  ]);

  const totalVacant = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const outstandingMinor = (outstandingAgg._sum.amountDueMinor ?? 0) - (outstandingAgg._sum.amountPaidMinor ?? 0);

  return {
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
    rentExpectedThisMonthMinor: obligationsThisMonth._sum.amountDueMinor ?? 0,
    rentCollectedThisMonthMinor: paymentsThisMonth._sum.amountMinor ?? 0,
    outstandingRentMinor: Math.max(outstandingMinor, 0),
    overdueObligationCount: overdueCount,
    openMaintenanceCount,
    recentPayments,
    expiringLeases: { in30: expiring30, in60: expiring60, in90: expiring90 },
  };
}
