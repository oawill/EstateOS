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
    include: { _count: { select: { members: true, residents: true, properties: true } } },
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
