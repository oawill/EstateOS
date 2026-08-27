import { DemoRequestStatus, OrganizationType, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { nextPlatformSequenceNumber, formatSequenceCode } from "./sequence";
import { isRateLimited, RATE_LIMIT_WINDOW_MS } from "./rateLimit";
import { sendCustomerServiceNotification, sendProspectConfirmation } from "./email";
import type { DemoRequestInput } from "./schema";

export async function createDemoRequest(input: DemoRequestInput, ipHash: string | null) {
  if (ipHash) {
    const recentCount = await prisma.demoRequest.count({
      where: { ipHash, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
    });
    if (isRateLimited(recentCount)) {
      throw new ForbiddenError("Too many demo requests submitted recently. Please try again later.");
    }
  }

  const sequenceValue = await nextPlatformSequenceNumber(prisma, "demoRequest");
  const referenceNumber = formatSequenceCode("DEMO", sequenceValue);

  const request = await prisma.demoRequest.create({
    data: {
      referenceNumber,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      organizationName: input.organizationName,
      organizationType: input.organizationType,
      country: input.country,
      city: input.city,
      timezone: input.timezone,
      unitRange: input.unitRange,
      shortletUnits: input.shortletUnits,
      shortletBookingProcess: input.shortletBookingProcess,
      shortletChallenge: input.shortletChallenge,
      primaryChallenge: input.primaryChallenge,
      interestedFeatures: input.interestedFeatures ?? [],
      preferredDemoDate: input.preferredDemoDate,
      preferredDemoTime: input.preferredDemoTime,
      currentSoftware: input.currentSoftware,
      comments: input.comments,
      consent: input.consent,
      ipHash,
    },
  });

  // Best-effort — a provider outage or missing configuration must never
  // lose the database submission we just made.
  await Promise.allSettled([sendCustomerServiceNotification(request), sendProspectConfirmation(request)]);

  return request;
}

export interface DemoRequestFilters {
  status?: DemoRequestStatus;
  country?: string;
  organizationType?: OrganizationType;
  assignedToUserId?: string;
  from?: Date;
  to?: Date;
}

export async function listDemoRequests(filters: DemoRequestFilters) {
  return prisma.demoRequest.findMany({
    where: {
      status: filters.status,
      country: filters.country,
      organizationType: filters.organizationType,
      assignedToUserId: filters.assignedToUserId,
      createdAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
    },
    include: { assignedTo: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDemoRequestDetail(id: string) {
  const request = await prisma.demoRequest.findUnique({ where: { id }, include: { assignedTo: true } });
  if (!request) throw new NotFoundError("Demo request");
  return request;
}

/**
 * Public, unauthenticated lookup for the success screen — only ever reads
 * back the prospect's own just-submitted data (first name + whether
 * Shortlet was selected), keyed by the reference number already shown to
 * them, rather than stuffing more PII into the success-page URL. Deliberately
 * returns a minimal shape, not the full record (email/phone/comments etc.
 * never render on this public page).
 */
export async function getDemoRequestByReference(referenceNumber: string) {
  const request = await prisma.demoRequest.findUnique({
    where: { referenceNumber },
    select: { fullName: true, interestedFeatures: true },
  });
  if (!request) return null;
  return {
    firstName: request.fullName.trim().split(/\s+/)[0] || request.fullName,
    wantsShortlet: request.interestedFeatures.includes("SHORTLET_MANAGEMENT"),
  };
}

export async function updateDemoRequestStatus(actorUserId: string, id: string, status: DemoRequestStatus) {
  const before = await prisma.demoRequest.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Demo request");

  const after = await prisma.demoRequest.update({ where: { id }, data: { status } });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "demoRequest.status_changed",
    entityType: "DemoRequest",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function assignDemoRequest(actorUserId: string, id: string, assignedToUserId: string | null) {
  const before = await prisma.demoRequest.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Demo request");

  const after = await prisma.demoRequest.update({ where: { id }, data: { assignedToUserId } });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "demoRequest.assigned",
    entityType: "DemoRequest",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function updateDemoRequestNotes(actorUserId: string, id: string, internalNotes: string) {
  const before = await prisma.demoRequest.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Demo request");

  const after = await prisma.demoRequest.update({ where: { id }, data: { internalNotes } });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "demoRequest.notes_updated",
    entityType: "DemoRequest",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function recordScheduledDemo(actorUserId: string, id: string, scheduledDemoAt: Date | null) {
  const before = await prisma.demoRequest.findUnique({ where: { id } });
  if (!before) throw new NotFoundError("Demo request");

  const after = await prisma.demoRequest.update({ where: { id }, data: { scheduledDemoAt } });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "demoRequest.scheduled_demo_recorded",
    entityType: "DemoRequest",
    entityId: id,
    before,
    after,
  });

  return after;
}

export async function getNewDemoRequestCount() {
  return prisma.demoRequest.count({ where: { status: DemoRequestStatus.NEW } });
}

const platformAdminWhere = Prisma.validator<Prisma.UserWhereInput>()({ isPlatformAdmin: true });

export async function listAssignableStaff() {
  return prisma.user.findMany({ where: platformAdminWhere, orderBy: { name: "asc" } });
}
