import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";

/**
 * Optional post-activation step — a Tenant relationship (this module) and
 * an Estate Resident relationship (Estate Management) are deliberately
 * kept distinct models; this only creates the Resident row that lets an
 * already-active Tenant also use estate community/gate-pass features. It
 * never runs automatically as part of convertApplicantToTenant().
 *
 * Note: this creates a bare Resident record (no Occupancy/unit mapping,
 * since Estate Management's Unit model is separate from RentalUnit and
 * choosing the right one is a manual, estate-specific decision) — an
 * estate admin can complete the fuller unit assignment from the Estate
 * Management side afterwards.
 */
export async function connectTenantToEstate(actor: CurrentUser, tenantId: string, estateId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { unit: true } });
  if (!tenant) throw new NotFoundError("Tenant");
  if (tenant.unit) await assertPropertyAccess(actor, tenant.unit.propertyId);

  const [firstName, ...rest] = tenant.fullName.trim().split(/\s+/);

  const resident = await prisma.resident.create({
    data: {
      estateId,
      userId: tenant.userId,
      firstName: firstName || tenant.fullName,
      lastName: rest.join(" ") || "-",
      email: tenant.email,
      phone: tenant.phone,
      emergencyContactName: tenant.emergencyContactName,
      emergencyContactPhone: tenant.emergencyContactPhone,
    },
  });

  await recordAudit({
    estateId,
    actorUserId: actor.id,
    action: "tenant_management.tenant.connected_to_estate",
    entityType: "Resident",
    entityId: resident.id,
    after: resident,
  });

  return resident;
}
