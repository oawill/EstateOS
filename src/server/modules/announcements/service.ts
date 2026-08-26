import { AnnouncementTargetType, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { dispatchNotification } from "@/server/modules/notifications/dispatch";
import type { CreateAnnouncementInput } from "./schema";

async function resolveTargetUnitIds(
  estateId: string,
  targetType: AnnouncementTargetType,
  criteria: Record<string, unknown>,
): Promise<string[]> {
  const where: Prisma.UnitWhereInput = { estateId };

  switch (targetType) {
    case AnnouncementTargetType.ENTIRE_ESTATE:
      break;
    case AnnouncementTargetType.BLOCK:
      where.property = { blockId: { in: criteria.blockIds as string[] } };
      break;
    case AnnouncementTargetType.STREET:
      where.property = { streetId: { in: criteria.streetIds as string[] } };
      break;
    case AnnouncementTargetType.ZONE:
      where.property = { zoneId: { in: criteria.zoneIds as string[] } };
      break;
    case AnnouncementTargetType.SELECTED_PROPERTIES:
      where.propertyId = { in: criteria.propertyIds as string[] };
      break;
  }

  const units = await prisma.unit.findMany({ where, select: { id: true } });
  return units.map((u) => u.id);
}

/**
 * Every current occupant — owner, tenant, AND household members — unlike
 * billing's owner-then-tenant-only resolution. A power-outage notice
 * should reach everyone living there, not just whoever's billed.
 */
async function currentResidentIdsForUnits(unitIds: string[]): Promise<string[]> {
  if (unitIds.length === 0) return [];
  const occupancies = await prisma.occupancy.findMany({
    where: { unitId: { in: unitIds }, isCurrent: true },
    select: { residentId: true },
  });
  return [...new Set(occupancies.map((o) => o.residentId))];
}

export async function createAnnouncement(estateId: string, actorUserId: string, input: CreateAnnouncementInput) {
  const criteria = input.targetCriteria as Record<string, unknown>;
  const unitIds = await resolveTargetUnitIds(estateId, input.targetType, criteria);
  const residentIds = await currentResidentIdsForUnits(unitIds);

  const announcement = await scoped(estateId).announcement.create({
    authorUserId: actorUserId,
    title: input.title,
    body: input.body,
    category: input.category,
    targetType: input.targetType,
    targetCriteria: criteria as Prisma.InputJsonValue,
  });

  for (const residentId of residentIds) {
    await dispatchNotification(estateId, {
      residentId,
      title: announcement.title,
      body: announcement.body,
      announcementId: announcement.id,
    });
  }

  await recordAudit({
    estateId,
    actorUserId,
    action: "announcement.created",
    entityType: "Announcement",
    entityId: announcement.id,
    after: { ...announcement, targetedResidents: residentIds.length },
  });

  return announcement;
}

export async function listAnnouncements(estateId: string) {
  return scoped(estateId).announcement.findMany({ orderBy: { createdAt: "desc" } });
}

const notificationWithAnnouncement = Prisma.validator<Prisma.NotificationDefaultArgs>()({
  include: { announcement: true },
});
export type NotificationWithAnnouncement = Prisma.NotificationGetPayload<typeof notificationWithAnnouncement>;

export async function listNotificationsForResident(estateId: string, residentId: string) {
  return scoped(estateId).notification.findMany<NotificationWithAnnouncement>({
    where: { residentId } as never,
    orderBy: { createdAt: "desc" },
    include: notificationWithAnnouncement.include,
  });
}

export async function markNotificationRead(estateId: string, residentId: string, notificationId: string) {
  const notification = await scoped(estateId).notification.findById(notificationId);
  if (!notification || notification.residentId !== residentId) throw new NotFoundError("Notification");
  if (notification.readAt) return notification; // idempotent

  return scoped(estateId).notification.update(notificationId, { readAt: new Date() });
}

export async function countUnreadNotifications(estateId: string, residentId: string): Promise<number> {
  return prisma.notification.count({ where: { estateId, residentId, readAt: null } });
}
