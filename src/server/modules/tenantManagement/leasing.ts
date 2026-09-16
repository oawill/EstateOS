import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { nextLeaseCode } from "./sequence";
import { generateRentObligationsForLease } from "./lease";

function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/**
 * Generates the actual Lease row for an accepted offer — reuses the same
 * obligation-generation engine as createLease()/renewLease() in lease.ts
 * rather than a second billing path, but deliberately does NOT flip the
 * lease to ACTIVE or the unit to OCCUPIED yet: those only happen once
 * convertApplicantToTenant() runs the tenant through the full move-in
 * activation. Idempotent — calling it twice for the same offer just
 * returns the lease already generated.
 */
export async function generateLeaseFromOffer(actor: CurrentUser, offerId: string) {
  const offer = await prisma.rentalOffer.findUnique({
    where: { id: offerId },
    include: {
      lease: true,
      listing: { include: { unit: { include: { property: true } } } },
      application: { include: { applicant: true } },
      reservation: true,
    },
  });
  if (!offer) throw new NotFoundError("Offer");
  await assertPropertyAccess(actor, offer.listing.propertyId);

  if (offer.leaseId && offer.lease) return offer.lease;
  if (offer.status !== "ACCEPTED") throw new ForbiddenError("Only an accepted offer can be converted into a lease");

  const applicant = offer.application.applicant;
  const ownerId = offer.listing.unit.property.ownerId;

  const startDate = offer.proposedStartDate;
  const endDate = addMonthsUTC(startDate, offer.leaseDurationMonths);
  const leaseCode = await nextLeaseCode();

  const lease = await prisma.$transaction(async (tx) => {
    let tenant = applicant.userId ? await tx.tenant.findUnique({ where: { userId: applicant.userId } }) : null;
    if (!tenant) {
      tenant = await tx.tenant.create({
        data: {
          userId: applicant.userId,
          createdByOwnerId: ownerId,
          fullName: offer.application.fullName,
          email: offer.application.email,
          phone: offer.application.phone,
          whatsapp: offer.application.whatsapp,
          emergencyContactName: offer.application.emergencyContactName,
          emergencyContactPhone: offer.application.emergencyContactPhone,
          status: "APPLICANT",
        },
      });
    }

    const lease = await tx.lease.create({
      data: {
        leaseCode,
        tenantId: tenant.id,
        unitId: offer.unitId,
        startDate,
        endDate,
        rentAmountMinor: offer.rentAmountMinor,
        paymentFrequency: offer.paymentFrequency,
        securityDepositMinor: offer.securityDepositMinor,
        serviceChargeMinor: offer.serviceChargeMinor,
        renewalTerms: offer.specialConditions,
        status: "DRAFT",
      },
    });

    await generateRentObligationsForLease(tx, lease.id, startDate, endDate, offer.paymentFrequency, offer.rentAmountMinor, lease.rentDueDay);

    if (offer.securityDepositMinor > 0) {
      await tx.tenantCharge.create({
        data: {
          tenantId: tenant.id,
          propertyId: offer.listing.propertyId,
          unitId: offer.unitId,
          leaseId: lease.id,
          type: "SECURITY_DEPOSIT",
          amountMinor: offer.securityDepositMinor,
          dueDate: startDate,
          description: `Security deposit — ${offer.offerReference}`,
        },
      });
    }

    await tx.rentalOffer.update({ where: { id: offerId }, data: { leaseId: lease.id } });
    if (offer.reservation) {
      await tx.unitReservation.update({ where: { id: offer.reservation.id }, data: { status: "CONVERTED_TO_LEASE" } });
    }

    return lease;
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.lease.generated_from_offer",
    entityType: "Lease",
    entityId: lease.id,
    after: lease,
  });

  return lease;
}

export async function sendLeaseForSignature(actor: CurrentUser, leaseId: string) {
  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, include: { unit: true } });
  if (!lease) throw new NotFoundError("Lease");
  await assertPropertyAccess(actor, lease.unit.propertyId);

  return prisma.lease.update({
    where: { id: leaseId },
    data: { documentStatus: "SENT_TO_TENANT", sentToTenantAt: new Date() },
  });
}

/**
 * Records that a lease has been signed. `MANUAL_UPLOAD` is the only
 * provider actually wired up in this phase — a signed PDF uploaded by
 * staff via documentUrl. DOCUSIGN/OTHER exist purely so a real
 * e-signature integration has a slot to plug into later without another
 * schema change; nothing here calls out to an external signer.
 */
export async function recordLeaseSigned(actor: CurrentUser, leaseId: string, documentUrl: string) {
  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, include: { unit: true } });
  if (!lease) throw new NotFoundError("Lease");
  await assertPropertyAccess(actor, lease.unit.propertyId);

  const updated = await prisma.lease.update({
    where: { id: leaseId },
    data: {
      documentStatus: "SIGNED",
      signatureProvider: "MANUAL_UPLOAD",
      documentUrl,
      signedAt: new Date(),
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.lease.signed",
    entityType: "Lease",
    entityId: leaseId,
    after: updated,
  });

  return updated;
}
