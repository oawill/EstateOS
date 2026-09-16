import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { nextOfferReference } from "./sequence";
import type { CreateOfferInput, RespondToOfferInput } from "./schema";

export async function createOffer(actor: CurrentUser, input: CreateOfferInput) {
  const application = await prisma.rentalApplication.findUnique({
    where: { id: input.applicationId },
    include: { listing: true },
  });
  if (!application) throw new NotFoundError("Application");
  await assertPropertyAccess(actor, application.listing.propertyId);
  if (application.status !== "APPROVED") {
    throw new ForbiddenError("An offer can only be sent once the application has been approved");
  }

  const existingActiveReservation = await prisma.unitReservation.findFirst({
    where: { unitId: application.listing.unitId, status: "ACTIVE" },
  });
  if (existingActiveReservation) {
    throw new ForbiddenError("This unit already has an active reservation from another offer");
  }

  const offerReference = await nextOfferReference();

  const offer = await prisma.$transaction(async (tx) => {
    const offer = await tx.rentalOffer.create({
      data: {
        offerReference,
        applicationId: input.applicationId,
        listingId: application.listingId,
        unitId: application.listing.unitId,
        rentAmountMinor: input.rentAmountMinor,
        paymentFrequency: input.paymentFrequency,
        serviceChargeMinor: input.serviceChargeMinor,
        securityDepositMinor: input.securityDepositMinor,
        leaseDurationMonths: input.leaseDurationMonths,
        proposedStartDate: input.proposedStartDate,
        expiresAt: input.expiresAt,
        specialConditions: input.specialConditions || null,
        createdByUserId: actor.id,
        status: "SENT",
      },
    });
    await tx.rentalApplication.update({ where: { id: input.applicationId }, data: { status: "OFFER_SENT" } });
    await tx.rentalListing.update({
      where: { id: application.listingId },
      data: { status: "UNDER_OFFER" },
    });
    return offer;
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.offer.created",
    entityType: "RentalOffer",
    entityId: offer.id,
    after: offer,
  });

  return offer;
}

/** Public entry point — the applicant accepts, declines, or lets an offer sit (handled separately by expireStaleOffers). */
export async function respondToOffer(input: RespondToOfferInput) {
  const offer = await prisma.rentalOffer.findUnique({
    where: { id: input.offerId },
    include: { application: true, listing: true },
  });
  if (!offer) throw new NotFoundError("Offer");
  if (offer.status !== "SENT") throw new ForbiddenError("This offer has already been responded to");

  if (!input.accept) {
    // Only reopen the listing if this unit isn't already reserved/leased
    // through a different, already-accepted offer — otherwise declining a
    // stale second offer would incorrectly reopen a unit that's spoken for.
    const unitAlreadyCommitted = await prisma.unitReservation.findFirst({
      where: { unitId: offer.unitId, status: { in: ["ACTIVE", "CONVERTED_TO_LEASE"] } },
    });

    const [updatedOffer] = await prisma.$transaction([
      prisma.rentalOffer.update({
        where: { id: input.offerId },
        data: { status: "DECLINED", respondedAt: new Date(), declineReason: input.declineReason || null },
      }),
      prisma.rentalApplication.update({ where: { id: offer.applicationId }, data: { status: "APPROVED" } }),
      ...(unitAlreadyCommitted
        ? []
        : [prisma.rentalListing.update({ where: { id: offer.listingId }, data: { status: "APPLICATIONS_OPEN" } })]),
    ]);
    return updatedOffer;
  }

  const existingActiveReservation = await prisma.unitReservation.findFirst({
    where: { unitId: offer.unitId, status: "ACTIVE" },
  });
  if (existingActiveReservation) {
    throw new ForbiddenError("This unit was reserved by another offer in the meantime");
  }

  const [updatedOffer] = await prisma.$transaction([
    prisma.rentalOffer.update({ where: { id: input.offerId }, data: { status: "ACCEPTED", respondedAt: new Date() } }),
    prisma.rentalApplication.update({ where: { id: offer.applicationId }, data: { status: "LEASE_PENDING" } }),
    prisma.rentalListing.update({ where: { id: offer.listingId }, data: { status: "RESERVED" } }),
    prisma.rentalUnit.update({ where: { id: offer.unitId }, data: { status: "RESERVED" } }),
    prisma.unitReservation.create({
      data: { unitId: offer.unitId, offerId: offer.id, applicantId: offer.application.applicantId, status: "ACTIVE" },
    }),
  ]);

  await recordAudit({
    estateId: null,
    actorUserId: null,
    action: "tenant_management.offer.accepted",
    entityType: "RentalOffer",
    entityId: input.offerId,
    after: updatedOffer,
  });

  return updatedOffer;
}

/**
 * Releases an offer's unit reservation back to the market — used when an
 * offer expires or the manager withdraws it, never automatically for an
 * accepted offer that already has a lease.
 */
export async function releaseReservationForOffer(actor: CurrentUser, offerId: string) {
  const offer = await prisma.rentalOffer.findUnique({ where: { id: offerId }, include: { listing: true, reservation: true } });
  if (!offer) throw new NotFoundError("Offer");
  await assertPropertyAccess(actor, offer.listing.propertyId);
  if (offer.leaseId) throw new ForbiddenError("This offer already has a lease — release the lease instead");

  await prisma.$transaction([
    prisma.rentalOffer.update({ where: { id: offerId }, data: { status: "WITHDRAWN" } }),
    prisma.rentalListing.update({ where: { id: offer.listingId }, data: { status: "APPLICATIONS_OPEN" } }),
    prisma.rentalUnit.update({ where: { id: offer.unitId }, data: { status: "VACANT" } }),
    ...(offer.reservation
      ? [
          prisma.unitReservation.update({
            where: { id: offer.reservation.id },
            data: { status: "RELEASED", releasedAt: new Date() },
          }),
        ]
      : []),
  ]);
}

/** Meant to be called from a scheduled job (not yet wired to a cron trigger) — flips SENT offers past expiresAt to EXPIRED and frees the unit. */
export async function expireStaleOffers() {
  const stale = await prisma.rentalOffer.findMany({ where: { status: "SENT", expiresAt: { lt: new Date() } } });
  for (const offer of stale) {
    await prisma.$transaction([
      prisma.rentalOffer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } }),
      prisma.rentalApplication.update({ where: { id: offer.applicationId }, data: { status: "APPROVED" } }),
      prisma.rentalListing.update({ where: { id: offer.listingId }, data: { status: "APPLICATIONS_OPEN" } }),
    ]);
  }
  return stale.length;
}
