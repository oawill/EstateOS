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
      preferredContactMethod: input.preferredContactMethod,
      organizationName: input.organizationName,
      organizationType: input.organizationType,
      country: input.country,
      region: input.region,
      city: input.city,
      timezone: input.timezone,
      numberOfEstates: input.numberOfEstates,
      numberOfUnits: input.numberOfUnits,
      numberOfResidents: input.numberOfResidents,
      shortletUnits: input.shortletUnits,
      currentManagementMethods: input.currentManagementMethods ?? [],
      challenges: input.challenges ?? [],
      interestedFeatures: input.interestedFeatures ?? [],
      preferredDemoDate: input.preferredDemoDate,
      preferredDemoTime: input.preferredDemoTime,
      alternateDemoDatetime: input.alternateDemoDatetime,
      currentSoftware: input.currentSoftware,
      primaryObjective: input.primaryObjective,
      comments: input.comments,
      referralSource: input.referralSource,
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
