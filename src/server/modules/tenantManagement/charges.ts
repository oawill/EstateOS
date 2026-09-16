import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess, getAuthorizedPropertyIds } from "./access";
import type { CreateTenantChargeInput } from "./schema";

/** A non-rent billable item (service charge, deposit, utility, maintenance recharge, late fee, other) — rent itself always goes through RentObligation instead. */
export async function createTenantCharge(actor: CurrentUser, input: CreateTenantChargeInput) {
  await assertPropertyAccess(actor, input.propertyId);

  const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId } });
  if (!tenant) throw new NotFoundError("Tenant");

  const charge = await prisma.tenantCharge.create({
    data: {
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      leaseId: input.leaseId ?? null,
      type: input.type,
      amountMinor: input.amountMinor,
      dueDate: input.dueDate,
      description: input.description,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.charge.created",
    entityType: "TenantCharge",
    entityId: charge.id,
    after: charge,
  });

  return charge;
}

export async function listAccessibleCharges(actor: CurrentUser) {
  const authorized = await getAuthorizedPropertyIds(actor);
  return prisma.tenantCharge.findMany({
    where: authorized === "all" ? undefined : { propertyId: { in: authorized } },
    include: { tenant: true, property: true, unit: true },
    orderBy: { dueDate: "desc" },
  });
}

export async function listUnpaidChargesForTenant(tenantId: string) {
  return prisma.tenantCharge.findMany({
    where: { tenantId, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
    orderBy: { dueDate: "asc" },
  });
}
