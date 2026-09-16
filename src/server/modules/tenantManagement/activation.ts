import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { generateRentObligationsForLease } from "./lease";
import { isReadyForActivation } from "./moveInReadiness";
import { advanceMoveInStage } from "./moveInOut";

/**
 * The "Activate Tenant" step — connects everything created across the
 * leasing pipeline (RentalApplicant -> RentalApplication -> RentalOffer ->
 * Lease) into an active Tenant, only once the move-in readiness checklist
 * says it's safe to. Never creates a duplicate User: a User is only ever
 * connected via the Tenant row that generateLeaseFromOffer() already
 * created (reusing an existing account when the applicant had one).
 */
export async function convertApplicantToTenant(actor: CurrentUser, moveInId: string) {
  const moveIn = await prisma.moveIn.findUnique({
    where: { id: moveInId },
    include: {
      lease: { include: { offer: true } },
      tenant: true,
      unit: { include: { property: true } },
    },
  });
  if (!moveIn) throw new NotFoundError("Move-in");
  await assertPropertyAccess(actor, moveIn.unit.propertyId);

  const ready = await isReadyForActivation(moveInId);
  if (!ready) throw new ForbiddenError("Move-in readiness checklist is not complete yet");

  const listingId = moveIn.lease.offer?.listingId ?? null;
  const winningApplicationId = moveIn.lease.offer?.applicationId ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.lease.update({
      where: { id: moveIn.leaseId },
      data: { status: "ACTIVE", documentStatus: "ACTIVE" },
    });

    await generateRentObligationsForLease(
      tx,
      moveIn.leaseId,
      moveIn.lease.startDate,
      moveIn.lease.endDate,
      moveIn.lease.paymentFrequency,
      moveIn.lease.rentAmountMinor,
      moveIn.lease.rentDueDay,
    );

    await tx.tenant.update({ where: { id: moveIn.tenantId }, data: { unitId: moveIn.unitId } });
    await tx.rentalUnit.update({ where: { id: moveIn.unitId }, data: { status: "OCCUPIED" } });

    if (listingId) {
      await tx.rentalListing.update({ where: { id: listingId }, data: { status: "LEASED" } });

      if (winningApplicationId) {
        await tx.rentalApplication.update({ where: { id: winningApplicationId }, data: { status: "LEASE_SIGNED" } });

        const otherOpenApplications = await tx.rentalApplication.findMany({
          where: {
            listingId,
            id: { not: winningApplicationId },
            status: { notIn: ["REJECTED", "WITHDRAWN", "LEASE_SIGNED"] },
          },
        });
        for (const application of otherOpenApplications) {
          await tx.applicationDecision.create({
            data: {
              applicationId: application.id,
              decision: "REJECT",
              reason: "Unit leased to another applicant",
              decidedByUserId: actor.id,
            },
          });
          await tx.rentalApplication.update({ where: { id: application.id }, data: { status: "REJECTED" } });
        }
      }
    }
  });

  await advanceMoveInStage(actor, moveInId, "COMPLETED");

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.tenant.activated",
    entityType: "Tenant",
    entityId: moveIn.tenantId,
  });

  return prisma.tenant.findUniqueOrThrow({ where: { id: moveIn.tenantId } });
}
