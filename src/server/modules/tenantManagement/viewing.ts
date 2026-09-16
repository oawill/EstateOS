import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { findOrCreateApplicant } from "./applicant";
import type { ScheduleViewingInput, RecordViewingOutcomeInput } from "./schema";

/** Public entry point — a prospect requests a viewing from the listing page; a manager confirms it later. */
export async function scheduleViewing(input: ScheduleViewingInput) {
  const listing = await prisma.rentalListing.findUnique({ where: { id: input.listingId } });
  if (!listing) throw new NotFoundError("Listing");

  let applicantId = input.applicantId;
  if (!applicantId && input.name) {
    const applicant = await findOrCreateApplicant({ fullName: input.name, email: input.email, phone: input.phone });
    applicantId = applicant.id;
  }

  return prisma.viewing.create({
    data: {
      listingId: listing.id,
      unitId: listing.unitId,
      applicantId: applicantId || null,
      type: input.type,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime || null,
      alternativeDate: input.alternativeDate,
      alternativeTime: input.alternativeTime || null,
      notes: input.notes || null,
      status: "REQUESTED",
    },
  });
}

export async function confirmViewing(actor: CurrentUser, viewingId: string) {
  const viewing = await prisma.viewing.findUnique({ where: { id: viewingId }, include: { listing: true } });
  if (!viewing) throw new NotFoundError("Viewing");
  await assertPropertyAccess(actor, viewing.listing.propertyId);

  const updated = await prisma.viewing.update({
    where: { id: viewingId },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.viewing.confirmed",
    entityType: "Viewing",
    entityId: viewingId,
    after: updated,
  });
  return updated;
}

export async function cancelViewing(actor: CurrentUser, viewingId: string) {
  const viewing = await prisma.viewing.findUnique({ where: { id: viewingId }, include: { listing: true } });
  if (!viewing) throw new NotFoundError("Viewing");
  await assertPropertyAccess(actor, viewing.listing.propertyId);
  return prisma.viewing.update({ where: { id: viewingId }, data: { status: "CANCELLED" } });
}

export async function recordViewingOutcome(actor: CurrentUser, input: RecordViewingOutcomeInput) {
  const viewing = await prisma.viewing.findUnique({ where: { id: input.viewingId }, include: { listing: true } });
  if (!viewing) throw new NotFoundError("Viewing");
  await assertPropertyAccess(actor, viewing.listing.propertyId);

  const updated = await prisma.viewing.update({
    where: { id: input.viewingId },
    data: {
      status: input.attended ? "COMPLETED" : "NO_SHOW",
      attended: input.attended,
      interested: input.interested ?? null,
      applicationInvited: input.applicationInvited ?? null,
      outcomeNotes: input.outcomeNotes || null,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.viewing.outcome_recorded",
    entityType: "Viewing",
    entityId: input.viewingId,
    after: updated,
  });

  return updated;
}

export async function listAccessibleViewings(propertyIds: string[] | "all") {
  return prisma.viewing.findMany({
    where: { listing: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } },
    include: { listing: { include: { unit: { include: { property: true } } } }, applicant: true },
    orderBy: { preferredDate: "asc" },
  });
}
