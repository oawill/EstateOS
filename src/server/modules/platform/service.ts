import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";

/**
 * Deliberately the only module allowed to query estates without a
 * per-request `estateId` filter — callers must be gated by
 * `requirePlatformAdmin()` before reaching here.
 */
export async function listAllEstates() {
  return prisma.estate.findMany({
    orderBy: { createdAt: "desc" },
    include: { plan: true, _count: { select: { members: true, residents: true, properties: true } } },
  });
}

export async function getEstateDetail(estateId: string) {
  const estate = await prisma.estate.findUnique({
    where: { id: estateId },
    include: { plan: true, _count: { select: { members: true, residents: true, properties: true } } },
  });
  if (!estate) throw new NotFoundError("Estate");

  const recentAudit = await prisma.auditLog.findMany({
    where: { estateId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { estate, recentAudit };
}

export async function assignPlan(
  actorUserId: string,
  estateId: string,
  planId: string | null,
  trialEndsAt: Date | null,
) {
  const before = await prisma.estate.findUnique({ where: { id: estateId } });
  if (!before) throw new NotFoundError("Estate");

  const after = await prisma.estate.update({
    where: { id: estateId },
    data: { planId, trialEndsAt },
  });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "estate.plan_assigned",
    entityType: "Estate",
    entityId: estateId,
    before,
    after,
  });

  return after;
}

export interface PlatformSummary {
  totalEstates: number;
  activeCount: number;
  trialCount: number;
  suspendedCount: number;
  pastDueCount: number;
  cancelledCount: number;
  totalResidents: number;
  totalProperties: number;
  projectedMrrKobo: number;
}

export async function getPlatformSummary(): Promise<PlatformSummary> {
  const [statusCounts, totalResidents, totalProperties, activeEstatesWithPlan] = await Promise.all([
    prisma.estate.groupBy({ by: ["subscriptionStatus"], _count: true }),
    prisma.resident.count(),
    prisma.property.count(),
    prisma.estate.findMany({
      where: { subscriptionStatus: "ACTIVE", planId: { not: null } },
      include: { plan: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.subscriptionStatus, s._count]));
  const totalEstates = statusCounts.reduce((sum, s) => sum + s._count, 0);
  const projectedMrrKobo = activeEstatesWithPlan.reduce((sum, e) => sum + (e.plan?.monthlyPriceKobo ?? 0), 0);

  return {
    totalEstates,
    activeCount: countByStatus.ACTIVE ?? 0,
    trialCount: countByStatus.TRIAL ?? 0,
    suspendedCount: countByStatus.SUSPENDED ?? 0,
    pastDueCount: countByStatus.PAST_DUE ?? 0,
    cancelledCount: countByStatus.CANCELLED ?? 0,
    totalResidents,
    totalProperties,
    projectedMrrKobo,
  };
}

const auditWithEstate = Prisma.validator<Prisma.AuditLogDefaultArgs>()({
  include: { estate: true, actor: true },
});
export type AuditLogWithEstate = Prisma.AuditLogGetPayload<typeof auditWithEstate>;

export async function listRecentAuditLogs(limit = 50) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: auditWithEstate.include,
  });
}

export async function listAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { memberships: true } } },
  });
}

export async function setEstateSubscriptionStatus(
  estateId: string,
  actorUserId: string,
  status: "ACTIVE" | "SUSPENDED",
) {
  const before = await prisma.estate.findUnique({ where: { id: estateId } });
  if (!before) throw new NotFoundError("Estate");

  const after = await prisma.estate.update({ where: { id: estateId }, data: { subscriptionStatus: status } });

  await recordAudit({
    estateId: null,
    actorUserId,
    action: "estate.subscription_status_changed",
    entityType: "Estate",
    entityId: estateId,
    before,
    after,
  });

  return after;
}
