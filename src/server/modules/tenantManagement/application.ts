import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { findOrCreateApplicant } from "./applicant";
import { nextApplicationReference } from "./sequence";
import { seedScreeningChecklist } from "./screening";
import type { StartApplicationInput, SaveApplicationInput, AddApplicationDocumentInput } from "./schema";

const PIPELINE_STATUSES: ApplicationStatus[] = [
  "REVIEWING",
  "INFORMATION_REQUIRED",
  "SCREENING",
  "VIEWING",
  "APPROVED",
  "OFFER_SENT",
  "LEASE_PENDING",
  "LEASE_SIGNED",
  "REJECTED",
  "WITHDRAWN",
];

/** Public entry point — begins a save-resumable application against an open listing. */
export async function startApplication(input: StartApplicationInput) {
  const listing = await prisma.rentalListing.findUnique({ where: { listingReference: input.listingReference } });
  if (!listing) throw new NotFoundError("Listing");
  if (!["AVAILABLE", "APPLICATIONS_OPEN"].includes(listing.status)) {
    throw new ForbiddenError("This listing is not currently accepting applications");
  }

  const applicant = await findOrCreateApplicant({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
  });

  const applicationReference = await nextApplicationReference();

  return prisma.rentalApplication.create({
    data: {
      applicationReference,
      listingId: listing.id,
      applicantId: applicant.id,
      status: "STARTED",
      fullName: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
    },
  });
}

/** Save/resume — an applicant can come back and fill in more sections without losing progress. */
export async function saveApplicationDraft(input: SaveApplicationInput) {
  const application = await prisma.rentalApplication.findUnique({ where: { id: input.applicationId } });
  if (!application) throw new NotFoundError("Application");
  if (!["STARTED", "INCOMPLETE"].includes(application.status)) {
    throw new ForbiddenError("This application has already been submitted and can no longer be edited here");
  }

  const { applicationId, ...fields } = input;
  void applicationId;

  return prisma.rentalApplication.update({
    where: { id: input.applicationId },
    data: {
      ...fields,
      email: fields.email || undefined,
      status: "INCOMPLETE",
    },
  });
}

export async function getApplicationByReference(applicationReference: string) {
  const application = await prisma.rentalApplication.findUnique({
    where: { applicationReference },
    include: { listing: true, documents: true },
  });
  if (!application) throw new NotFoundError("Application");
  return application;
}

export async function addApplicationDocument(input: AddApplicationDocumentInput) {
  const application = await prisma.rentalApplication.findUnique({ where: { id: input.applicationId } });
  if (!application) throw new NotFoundError("Application");

  return prisma.applicationDocument.create({
    data: {
      applicationId: input.applicationId,
      label: input.label,
      fileUrl: input.fileUrl,
      documentType: input.documentType || null,
    },
  });
}

/** Locks the application into the manager-facing pipeline and seeds its screening checklist. */
export async function submitApplication(applicationId: string) {
  const application = await prisma.rentalApplication.findUnique({ where: { id: applicationId } });
  if (!application) throw new NotFoundError("Application");
  if (!["STARTED", "INCOMPLETE"].includes(application.status)) {
    throw new ForbiddenError("This application has already been submitted");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const submitted = await tx.rentalApplication.update({
      where: { id: applicationId },
      data: { status: "REVIEWING", submittedAt: new Date() },
    });
    await tx.rentalInquiry.updateMany({
      where: { applicantId: application.applicantId, listingId: application.listingId },
      data: { status: "APPLICATION_SUBMITTED" },
    });
    return submitted;
  });

  await seedScreeningChecklist(applicationId);

  await recordAudit({
    estateId: null,
    actorUserId: null,
    action: "tenant_management.application.submitted",
    entityType: "RentalApplication",
    entityId: applicationId,
    after: updated,
  });

  return updated;
}

export async function assignApplication(actor: CurrentUser, applicationId: string, assignedToUserId: string) {
  const application = await prisma.rentalApplication.findUnique({ where: { id: applicationId }, include: { listing: true } });
  if (!application) throw new NotFoundError("Application");
  await assertPropertyAccess(actor, application.listing.propertyId);
  return prisma.rentalApplication.update({ where: { id: applicationId }, data: { assignedToUserId } });
}

export async function updateApplicationStatus(
  actor: CurrentUser,
  applicationId: string,
  status: (typeof PIPELINE_STATUSES)[number],
) {
  const application = await prisma.rentalApplication.findUnique({ where: { id: applicationId }, include: { listing: true } });
  if (!application) throw new NotFoundError("Application");
  await assertPropertyAccess(actor, application.listing.propertyId);

  const updated = await prisma.rentalApplication.update({ where: { id: applicationId }, data: { status } });
  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.application.status_changed",
    entityType: "RentalApplication",
    entityId: applicationId,
    before: application,
    after: updated,
  });
  return updated;
}

/** The manager-facing Kanban pipeline — every application beyond the applicant's own draft stage. */
export async function listApplicationPipeline(
  propertyIds: string[] | "all",
  filters: { propertyId?: string; unitId?: string; assignedToUserId?: string; status?: string } = {},
) {
  return prisma.rentalApplication.findMany({
    where: {
      status: { in: PIPELINE_STATUSES },
      assignedToUserId: filters.assignedToUserId,
      listing: {
        propertyId: filters.propertyId ?? (propertyIds === "all" ? undefined : { in: propertyIds }),
        unitId: filters.unitId,
      },
      ...(filters.status ? { status: filters.status as never } : {}),
    },
    include: {
      applicant: true,
      listing: { include: { unit: { include: { property: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getApplicationDetail(actor: CurrentUser, applicationId: string) {
  const application = await prisma.rentalApplication.findUnique({
    where: { id: applicationId },
    include: {
      applicant: true,
      listing: { include: { unit: { include: { property: true } } } },
      documents: true,
      screeningItems: true,
      decisions: { orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      offers: {
        orderBy: { createdAt: "desc" },
        include: { lease: { include: { moveIns: { include: { readiness: true } } } } },
      },
    },
  });
  if (!application) throw new NotFoundError("Application");
  await assertPropertyAccess(actor, application.listing.propertyId);
  return application;
}
