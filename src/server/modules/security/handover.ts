import { prisma } from "@/server/db/client";
import { recordAudit } from "@/server/modules/audit";

export async function createShiftHandover(estateId: string, authorUserId: string, input: { gate?: string; notes: string }) {
  const handover = await prisma.shiftHandover.create({
    data: { estateId, authorUserId, gate: input.gate || null, notes: input.notes },
  });

  await recordAudit({
    estateId,
    actorUserId: authorUserId,
    action: "security.shift_handover_recorded",
    entityType: "ShiftHandover",
    entityId: handover.id,
    after: handover,
  });

  return handover;
}

export async function listShiftHandovers(estateId: string, limit = 20) {
  return prisma.shiftHandover.findMany({
    where: { estateId },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
