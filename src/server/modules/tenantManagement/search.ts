import { prisma } from "@/server/db/client";
import type { CurrentUser } from "@/server/auth/session";
import { getAccessibleContext, getAuthorizedPropertyIds } from "./access";

/**
 * Universal search across Tenant Management, scoped to whatever the caller
 * is already authorized to see — a landlord/manager never gets a result
 * outside getAuthorizedPropertyIds()'s list, and a platform admin (only
 * caller who gets "all") searches everywhere. Kept intentionally simple
 * (independent small queries, not a full-text index) since the dataset
 * size here doesn't yet justify one.
 */
export async function searchTenantManagement(actor: CurrentUser, query: string) {
  const q = query.trim();
  if (q.length < 2) return { tenants: [], leases: [], payments: [], properties: [], landlords: [] };

  const authorized = await getAuthorizedPropertyIds(actor);
  const ctx = await getAccessibleContext(actor);
  const propertyFilter = authorized === "all" ? undefined : { in: authorized };

  const [tenants, leases, payments, properties, landlords] = await Promise.all([
    prisma.tenant.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
        ...(authorized === "all" ? {} : { unit: { propertyId: propertyFilter } }),
      },
      include: { unit: { include: { property: true } } },
      take: 10,
    }),
    prisma.lease.findMany({
      where: {
        leaseCode: { contains: q, mode: "insensitive" },
        unit: authorized === "all" ? undefined : { propertyId: propertyFilter },
      },
      include: { tenant: true, unit: { include: { property: true } } },
      take: 10,
    }),
    prisma.rentPayment.findMany({
      where: {
        OR: [{ referenceNumber: { contains: q, mode: "insensitive" } }, { transactionRef: { contains: q, mode: "insensitive" } }],
        lease: authorized === "all" ? undefined : { unit: { propertyId: propertyFilter } },
      },
      include: { tenant: true, lease: { include: { unit: { include: { property: true } } } } },
      take: 10,
    }),
    prisma.managedProperty.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
        id: authorized === "all" ? undefined : propertyFilter,
      },
      take: 10,
    }),
    // A non-admin caller can only ever "find" their own landlord profile —
    // browsing other landlords by name is a platform-admin-only capability.
    authorized === "all"
      ? prisma.propertyOwner.findMany({ where: { name: { contains: q, mode: "insensitive" } }, take: 10 })
      : ctx.ownerId
        ? prisma.propertyOwner.findMany({ where: { id: ctx.ownerId, name: { contains: q, mode: "insensitive" } }, take: 10 })
        : Promise.resolve([]),
  ]);

  return { tenants, leases, payments, properties, landlords };
}
