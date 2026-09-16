import { LeaseStatus, RentalMaintenanceStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";

/**
 * Deliberately the only module allowed to query Tenant Management data
 * across every landlord's portfolio at once — callers must be gated by
 * requirePlatformAdmin() before reaching here, same convention as
 * src/server/modules/platform/service.ts for the Estate Management side.
 */

export async function searchLandlords(query?: string) {
  return prisma.propertyOwner.findMany({
    where: query
      ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] }
      : undefined,
    include: { _count: { select: { properties: true, createdTenants: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function searchProperties(query?: string) {
  return prisma.managedProperty.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
            { owner: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: { owner: true, _count: { select: { units: true, managers: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function searchTenants(query?: string) {
  return prisma.tenant.findMany({
    where: query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { unit: { include: { property: { include: { owner: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function searchLeases(status?: LeaseStatus, query?: string) {
  return prisma.lease.findMany({
    where: {
      status,
      ...(query
        ? {
            OR: [
              { leaseCode: { contains: query, mode: "insensitive" } },
              { tenant: { fullName: { contains: query, mode: "insensitive" } } },
              { unit: { property: { name: { contains: query, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: { tenant: true, unit: { include: { property: { include: { owner: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function searchPayments(query?: string) {
  return prisma.rentPayment.findMany({
    where: query
      ? {
          OR: [
            { referenceNumber: { contains: query, mode: "insensitive" } },
            { transactionRef: { contains: query, mode: "insensitive" } },
            { tenant: { fullName: { contains: query, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: { tenant: true, lease: { include: { unit: { include: { property: { include: { owner: true } } } } } } },
    orderBy: { paidAt: "desc" },
    take: 200,
  });
}

export async function searchMaintenanceRequests(status?: RentalMaintenanceStatus) {
  return prisma.maintenanceRequest.findMany({
    where: { status },
    include: { property: { include: { owner: true } }, unit: true, tenant: true, expenses: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listPropertyManagerAssignments() {
  return prisma.propertyManager.findMany({
    include: { property: { include: { owner: true } }, user: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAllLandlordStatements() {
  return prisma.landlordStatement.findMany({
    include: { owner: true, property: true },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    take: 200,
  });
}

export async function getPlatformOverviewCounts() {
  const [landlords, properties, units, tenants, activeLeases, overdueObligations, openMaintenance] = await Promise.all([
    prisma.propertyOwner.count(),
    prisma.managedProperty.count(),
    prisma.rentalUnit.count(),
    prisma.tenant.count(),
    prisma.lease.count({ where: { status: "ACTIVE" } }),
    prisma.rentObligation.count({ where: { status: "OVERDUE" } }),
    prisma.maintenanceRequest.count({ where: { status: { notIn: ["COMPLETED", "CLOSED"] } } }),
  ]);
  return { landlords, properties, units, tenants, activeLeases, overdueObligations, openMaintenance };
}
