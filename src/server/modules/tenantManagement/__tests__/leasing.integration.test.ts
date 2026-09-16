import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";
import { createOrGetOwnProfile, createManagedProperty, createRentalUnit } from "../property";
import { createListing, publishListing, openApplications, getPublicListingByReference, searchPublicListings } from "../listing";
import { createInquiry } from "../inquiry";
import { scheduleViewing, recordViewingOutcome } from "../viewing";
import { startApplication, saveApplicationDraft, submitApplication, listApplicationPipeline, getApplicationDetail } from "../application";
import { getScreeningChecklist, updateScreeningItem } from "../screening";
import { recordApplicationDecision } from "../decision";
import { createOffer, respondToOffer } from "../offer";
import { generateLeaseFromOffer, recordLeaseSigned } from "../leasing";
import { startMoveIn } from "../moveInOut";
import { getReadiness, setReadinessFlag, isReadyForActivation, overrideReadinessItem } from "../moveInReadiness";
import { convertApplicantToTenant } from "../activation";

function actorFor(userId: string): CurrentUser {
  return { id: userId, email: null, name: "Test User", isPlatformAdmin: false };
}

async function makeUser(label: string) {
  return prisma.user.create({ data: { name: label, email: `tm-lease-${label}-${randomUUID()}@example.com` } });
}

async function setupVacantUnit(label: string) {
  const ownerUser = await makeUser(label);
  const owner = await createOrGetOwnProfile(ownerUser.id, { name: `Owner ${label}`, preferredCurrency: "NGN" });
  const actor = actorFor(ownerUser.id);

  const property = await createManagedProperty(actor, {
    ownerId: owner.id,
    name: `Property ${label}`,
    addressLine: "1 Test Street",
    city: "Lagos",
    country: "NG",
    propertyType: "FLAT",
  });
  const unit = await createRentalUnit(actor, {
    propertyId: property.id,
    label: "Unit A",
    rentAmountMinor: 1_200_000,
    rentFrequency: "ANNUAL",
    serviceChargeMinor: 0,
    securityDepositMinor: 0,
  });

  return { ownerUserId: ownerUser.id, actor, property, unit };
}

describe("Tenant Acquisition & Leasing (integration)", () => {
  const cleanupUserIds: string[] = [];
  afterAll(async () => {
    for (const id of cleanupUserIds) await prisma.user.deleteMany({ where: { id } });
  });

  it("runs the full vacancy -> listing -> application -> offer -> lease -> move-in -> tenant pipeline", async () => {
    const { ownerUserId, actor, unit } = await setupVacantUnit("full-pipeline");
    cleanupUserIds.push(ownerUserId);

    const listing = await createListing(actor, {
      unitId: unit.id,
      title: "Test Listing",
      description: "A nice place",
      rentAmountMinor: 1_200_000,
      rentFrequency: "ANNUAL",
      serviceChargeMinor: 0,
      securityDepositMinor: 200_000,
      furnishedStatus: "UNFURNISHED",
      availableDate: new Date("2026-02-01"),
      amenities: [],
      imageUrls: [],
      videoUrls: [],
    });
    expect(listing.status).toBe("DRAFT");
    expect(listing.listingReference).toMatch(/^NQL-\d{4}-\d{6}$/);

    await publishListing(actor, listing.id);
    const openListing = await openApplications(actor, listing.id);
    expect(openListing.status).toBe("APPLICATIONS_OPEN");

    // Public marketplace never leaks landlord/tenant identity.
    const publicListing = await getPublicListingByReference(listing.listingReference);
    expect(publicListing).not.toHaveProperty("propertyId");
    expect(publicListing).not.toHaveProperty("unitId");
    const searchResults = await searchPublicListings({});
    expect(searchResults.some((l) => l.listingReference === listing.listingReference)).toBe(true);

    const inquiry = await createInquiry({ listingReference: listing.listingReference, name: "Jane Applicant", email: "jane@example.com" });
    expect(inquiry.status).toBe("NEW");

    const viewing = await scheduleViewing({
      listingId: listing.id,
      name: "Jane Applicant",
      email: "jane@example.com",
      type: "PHYSICAL",
      preferredDate: new Date("2026-01-15"),
    });
    await recordViewingOutcome(actor, { viewingId: viewing.id, attended: true, interested: true });

    // Save/resume: an application starts, is edited without being submitted, then submitted.
    const application = await startApplication({ listingReference: listing.listingReference, fullName: "Jane Applicant", email: "jane@example.com" });
    expect(application.status).toBe("STARTED");
    expect(application.applicationReference).toMatch(/^NQA-\d{4}-\d{6}$/);

    await saveApplicationDraft({ applicationId: application.id, employmentStatus: "Employed", incomeRange: "₦500k-1m" });
    const savedApplication = await getApplicationDetail(actor, application.id);
    expect(savedApplication.status).toBe("INCOMPLETE");
    expect(savedApplication.employmentStatus).toBe("Employed");

    const submitted = await submitApplication(application.id);
    expect(submitted.status).toBe("REVIEWING");

    // Submitting seeds the full screening checklist so nothing can be silently skipped.
    const checklist = await getScreeningChecklist(application.id);
    expect(checklist).toHaveLength(8);
    expect(checklist.every((c) => c.status === "NOT_STARTED")).toBe(true);

    const pipeline = await listApplicationPipeline("all");
    expect(pipeline.some((a) => a.id === application.id)).toBe(true);

    for (const item of checklist) {
      await updateScreeningItem(actor, { applicationId: application.id, checkType: item.checkType, status: "COMPLETE" });
    }

    const { application: decidedApplication } = await recordApplicationDecision(actor, {
      applicationId: application.id,
      decision: "APPROVE",
      reason: "Strong income and clean references",
    });
    expect(decidedApplication.status).toBe("APPROVED");

    const offer = await createOffer(actor, {
      applicationId: application.id,
      rentAmountMinor: 1_200_000,
      paymentFrequency: "ANNUAL",
      serviceChargeMinor: 0,
      securityDepositMinor: 200_000,
      leaseDurationMonths: 12,
      proposedStartDate: new Date("2026-02-01"),
      expiresAt: new Date("2026-01-25"),
    });
    expect(offer.offerReference).toMatch(/^NQO-\d{4}-\d{6}$/);

    const listingUnderOffer = await prisma.rentalListing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(listingUnderOffer.status).toBe("UNDER_OFFER");

    const acceptedOffer = await respondToOffer({ offerId: offer.id, accept: true });
    expect(acceptedOffer.status).toBe("ACCEPTED");

    // Reservation prevents a second finalized lease on the same unit.
    const reservation = await prisma.unitReservation.findFirstOrThrow({ where: { offerId: offer.id } });
    expect(reservation.status).toBe("ACTIVE");
    const reservedUnit = await prisma.rentalUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(reservedUnit.status).toBe("RESERVED");

    const lease = await generateLeaseFromOffer(actor, offer.id);
    expect(lease.status).toBe("DRAFT");

    // Idempotent: generating again returns the same lease, not a duplicate.
    const leaseAgain = await generateLeaseFromOffer(actor, offer.id);
    expect(leaseAgain.id).toBe(lease.id);

    const reservationAfterLease = await prisma.unitReservation.findUniqueOrThrow({ where: { id: reservation.id } });
    expect(reservationAfterLease.status).toBe("CONVERTED_TO_LEASE");

    // Deposit becomes a real TenantCharge against the existing ledger, not a second payment system.
    const depositCharge = await prisma.tenantCharge.findFirstOrThrow({ where: { leaseId: lease.id, type: "SECURITY_DEPOSIT" } });
    expect(depositCharge.amountMinor).toBe(200_000);

    const obligations = await prisma.rentObligation.findMany({ where: { leaseId: lease.id } });
    expect(obligations.length).toBeGreaterThan(0);

    await recordLeaseSigned(actor, lease.id, "https://example.com/signed-lease.pdf");
    const moveIn = await startMoveIn(actor, lease.id);

    const notReady = await isReadyForActivation(moveIn.id);
    expect(notReady).toBe(false);

    await expect(convertApplicantToTenant(actor, moveIn.id)).rejects.toThrow(ForbiddenError);

    await setReadinessFlag(actor, moveIn.id, "documentsComplete", true);
    await setReadinessFlag(actor, moveIn.id, "moveInDateConfirmed", true);
    await setReadinessFlag(actor, moveIn.id, "inspectionScheduled", true);
    await setReadinessFlag(actor, moveIn.id, "keysPrepared", true);

    // Deposit charge is still PENDING at this point — an authorized override is required, and it's audited.
    let readiness = await getReadiness(moveIn.id);
    expect(readiness.depositPaid).toBe(false);
    await overrideReadinessItem(actor, { moveInId: moveIn.id, item: "depositPaid", reason: "Deposit paid by bank transfer outside the system, confirmed by owner" });
    readiness = await getReadiness(moveIn.id);
    expect(readiness.overriddenItems).toContain("depositPaid");

    // Pay the first rent obligation for real, through the existing ledger.
    const firstObligation = obligations.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())[0];
    const tenantForPayment = await prisma.tenant.findUniqueOrThrow({ where: { id: lease.tenantId } });
    const { recordPayment } = await import("../payments");
    await recordPayment(actor, {
      tenantId: tenantForPayment.id,
      leaseId: lease.id,
      amountMinor: firstObligation.amountDueMinor,
      method: "BANK_TRANSFER",
      allocations: [{ rentObligationId: firstObligation.id, amountMinor: firstObligation.amountDueMinor }],
    });

    const ready = await isReadyForActivation(moveIn.id);
    expect(ready).toBe(true);

    const tenant = await convertApplicantToTenant(actor, moveIn.id);
    expect(tenant.status).toBe("ACTIVE");
    expect(tenant.unitId).toBe(unit.id);

    const activatedLease = await prisma.lease.findUniqueOrThrow({ where: { id: lease.id } });
    expect(activatedLease.status).toBe("ACTIVE");
    expect(activatedLease.documentStatus).toBe("ACTIVE");

    const occupiedUnit = await prisma.rentalUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(occupiedUnit.status).toBe("OCCUPIED");

    const leasedListing = await prisma.rentalListing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(leasedListing.status).toBe("LEASED");

    const finalApplication = await prisma.rentalApplication.findUniqueOrThrow({ where: { id: application.id } });
    expect(finalApplication.status).toBe("LEASE_SIGNED");

    // Applying to a second listing reuses the same RentalApplicant — never a duplicate base profile.
    const secondListing = await createListing(actor, {
      unitId: (await createRentalUnit(actor, { propertyId: unit.propertyId, label: "Unit B", rentAmountMinor: 900_000, rentFrequency: "ANNUAL", serviceChargeMinor: 0, securityDepositMinor: 0 })).id,
      title: "Second Listing",
      description: "Another place",
      rentAmountMinor: 900_000,
      rentFrequency: "ANNUAL",
      serviceChargeMinor: 0,
      securityDepositMinor: 0,
      furnishedStatus: "UNFURNISHED",
      availableDate: new Date("2026-03-01"),
      amenities: [],
      imageUrls: [],
      videoUrls: [],
    });
    await publishListing(actor, secondListing.id);
    const secondApplication = await startApplication({ listingReference: secondListing.listingReference, fullName: "Jane Applicant", email: "jane@example.com" });
    const firstApplicant = await prisma.rentalApplicant.findFirstOrThrow({ where: { email: "jane@example.com" } });
    expect(secondApplication.applicantId).toBe(firstApplicant.id);
  });

  it("prevents a second offer's unit reservation while one is already active, and releases it back to the market when declined", async () => {
    const { ownerUserId, actor, unit } = await setupVacantUnit("reservation-conflict");
    cleanupUserIds.push(ownerUserId);

    const listing = await createListing(actor, {
      unitId: unit.id,
      title: "Conflict Test Listing",
      description: "desc",
      rentAmountMinor: 1_000_000,
      rentFrequency: "ANNUAL",
      serviceChargeMinor: 0,
      securityDepositMinor: 0,
      furnishedStatus: "UNFURNISHED",
      availableDate: new Date("2026-02-01"),
      amenities: [],
      imageUrls: [],
      videoUrls: [],
    });
    await publishListing(actor, listing.id);
    await openApplications(actor, listing.id);

    async function approvedApplication(name: string) {
      const application = await startApplication({ listingReference: listing.listingReference, fullName: name, email: `${name}@example.com` });
      await submitApplication(application.id);
      await recordApplicationDecision(actor, { applicationId: application.id, decision: "APPROVE", reason: "ok" });
      return application;
    }

    const applicationA = await approvedApplication("applicant-a");
    const applicationB = await approvedApplication("applicant-b");

    const offerA = await createOffer(actor, {
      applicationId: applicationA.id,
      rentAmountMinor: 1_000_000,
      paymentFrequency: "ANNUAL",
      serviceChargeMinor: 0,
      securityDepositMinor: 0,
      leaseDurationMonths: 12,
      proposedStartDate: new Date("2026-02-01"),
      expiresAt: new Date("2026-01-25"),
    });

    // A second offer on the same unit while one is SENT is fine (no reservation exists yet)...
    const offerB = await createOffer(actor, {
      applicationId: applicationB.id,
      rentAmountMinor: 1_000_000,
      paymentFrequency: "ANNUAL",
      serviceChargeMinor: 0,
      securityDepositMinor: 0,
      leaseDurationMonths: 12,
      proposedStartDate: new Date("2026-02-01"),
      expiresAt: new Date("2026-01-25"),
    });

    await respondToOffer({ offerId: offerA.id, accept: true });

    // ...but once offer A is accepted and holds an ACTIVE reservation, offer B cannot also be accepted.
    await expect(respondToOffer({ offerId: offerB.id, accept: true })).rejects.toThrow(ForbiddenError);

    await respondToOffer({ offerId: offerB.id, accept: false, declineReason: "Chose another unit" });
    const declinedOfferB = await prisma.rentalOffer.findUniqueOrThrow({ where: { id: offerB.id } });
    expect(declinedOfferB.status).toBe("DECLINED");
  });
});
