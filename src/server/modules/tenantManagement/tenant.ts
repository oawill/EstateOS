import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds, getAccessibleContext, requirePropertyOwner } from "./access";
import type { CreateTenantInput } from "./schema";

/** Only a landlord (not a bare property manager) can add a brand-new tenant — a tenant has no unit yet, so createdByOwnerId is the only thing that scopes it to a portfolio until a lease assigns it a unit. */
export async function createTenant(actor: CurrentUser, input: CreateTenantInput) {
  const { ownerId } = await requirePropertyOwner(actor);

  const tenant = await prisma.tenant.create({
    data: {
      createdByOwnerId: ownerId,
      fullName: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      whatsapp: input.whatsapp || null,
      emergencyContactName: input.emergencyContactName || null,
      emergencyContactPhone: input.emergencyContactPhone || null,
      notes: input.notes || null,
      status: "APPLICANT",
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.tenant.created",
    entityType: "Tenant",
    entityId: tenant.id,
    after: tenant,
  });

  return tenant;
}

/** Tenants currently attached to a unit within a property the caller may access, plus tenants the caller created but hasn't leased into a unit yet (an APPLICANT has no unit, so it isn't reachable by the unit->property scoping alone). */
export async function listAccessibleTenants(actor: CurrentUser) {
  const ctx = await getAccessibleContext(actor);
  const authorized = await getAuthorizedPropertyIds(actor);

  return prisma.tenant.findMany({
    where:
      authorized === "all"
        ? undefined
        : {
            OR: [
              { unit: { propertyId: { in: authorized } } },
              ...(ctx.ownerId ? [{ createdByOwnerId: ctx.ownerId }] : []),
            ],
          },
    include: { unit: { include: { property: true } }, leases: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

/** Everything the /tenant self-service portal needs for the signed-in tenant's own record — never takes a client-supplied tenantId. */
export async function getTenantPortalData(tenantId: string) {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    include: {
      unit: { include: { property: { include: { owner: true } } } },
      leases: { orderBy: { createdAt: "desc" }, take: 1, include: { obligations: { orderBy: { dueDate: "asc" } } } },
      documents: true,
      maintenanceRequests: { orderBy: { createdAt: "desc" } },
    },
  });

  const currentLease = tenant.leases[0] ?? null;
  const payments = currentLease
    ? await prisma.rentPayment.findMany({ where: { leaseId: currentLease.id }, orderBy: { paidAt: "desc" } })
    : [];

  const nextObligation = currentLease?.obligations.find((o) => o.status !== "PAID" && o.status !== "WAIVED") ?? null;
  const outstandingMinor = (currentLease?.obligations ?? []).reduce(
    (sum, o) => sum + Math.max(o.amountDueMinor - o.amountPaidMinor, 0),
    0,
  );

  return { tenant, currentLease, payments, nextObligation, outstandingMinor };
}

export async function getTenantDetail(actor: CurrentUser, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      unit: { include: { property: true } },
      leases: { orderBy: { createdAt: "desc" }, include: { obligations: { orderBy: { dueDate: "desc" } } } },
      documents: true,
      maintenanceRequests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!tenant) throw new NotFoundError("Tenant");

  const authorized = await getAuthorizedPropertyIds(actor);
  if (authorized !== "all") {
    if (tenant.unit) {
      if (!authorized.includes(tenant.unit.propertyId)) throw new NotFoundError("Tenant");
    } else {
      const ctx = await getAccessibleContext(actor);
      if (!ctx.ownerId || tenant.createdByOwnerId !== ctx.ownerId) throw new NotFoundError("Tenant");
    }
  }

  return tenant;
}
