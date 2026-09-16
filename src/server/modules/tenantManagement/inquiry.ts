import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { findOrCreateApplicant } from "./applicant";
import type { CreateInquiryInput } from "./schema";

/** Public entry point — no auth, called from the listing page's "Ask a Question"/contact form. */
export async function createInquiry(input: CreateInquiryInput) {
  const listing = await prisma.rentalListing.findUnique({ where: { listingReference: input.listingReference } });
  if (!listing) throw new NotFoundError("Listing");

  const applicant = await findOrCreateApplicant({
    fullName: input.name,
    email: input.email,
    phone: input.phone,
    whatsapp: input.whatsapp,
  });

  return prisma.rentalInquiry.create({
    data: {
      listingId: listing.id,
      applicantId: applicant.id,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      whatsapp: input.whatsapp || null,
      preferredMoveInDate: input.preferredMoveInDate,
      message: input.message || null,
      status: "NEW",
    },
  });
}

export async function listAccessibleInquiries(propertyIds: string[] | "all") {
  return prisma.rentalInquiry.findMany({
    where: { listing: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } },
    include: { listing: { include: { unit: { include: { property: true } } } }, applicant: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function assignInquiry(actor: CurrentUser, inquiryId: string, assignedToUserId: string) {
  const inquiry = await prisma.rentalInquiry.findUnique({ where: { id: inquiryId }, include: { listing: true } });
  if (!inquiry) throw new NotFoundError("Inquiry");
  await assertPropertyAccess(actor, inquiry.listing.propertyId);

  const updated = await prisma.rentalInquiry.update({ where: { id: inquiryId }, data: { assignedToUserId } });
  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.inquiry.assigned",
    entityType: "RentalInquiry",
    entityId: inquiryId,
    after: updated,
  });
  return updated;
}

export async function updateInquiryStatus(
  actor: CurrentUser,
  inquiryId: string,
  status: "NEW" | "CONTACTED" | "VIEWING_SCHEDULED" | "APPLICATION_STARTED" | "APPLICATION_SUBMITTED" | "CLOSED",
) {
  const inquiry = await prisma.rentalInquiry.findUnique({ where: { id: inquiryId }, include: { listing: true } });
  if (!inquiry) throw new NotFoundError("Inquiry");
  await assertPropertyAccess(actor, inquiry.listing.propertyId);

  const updated = await prisma.rentalInquiry.update({ where: { id: inquiryId }, data: { status } });
  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.inquiry.status_changed",
    entityType: "RentalInquiry",
    entityId: inquiryId,
    before: inquiry,
    after: updated,
  });
  return updated;
}
