import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { dispatchNotification } from "@/server/modules/notifications/dispatch";

const parcelInclude = {
  resident: { include: { occupancies: { where: { isCurrent: true }, include: { unit: { include: { property: true } } } } } },
} as const;

/** Security logs a parcel accepted at the gate and the resident is told right away. The resident is re-verified against this estate, never trusted from the form. */
export async function logParcel(
  estateId: string,
  securityUserId: string,
  input: { residentId: string; description: string; carrier?: string },
) {
  const resident = await prisma.resident.findFirst({ where: { id: input.residentId, estateId } });
  if (!resident) throw new NotFoundError("Resident");

  const parcel = await prisma.parcel.create({
    data: {
      estateId,
      residentId: resident.id,
      description: input.description,
      carrier: input.carrier || null,
      receivedByUserId: securityUserId,
    },
  });

  await recordAudit({
    estateId,
    actorUserId: securityUserId,
    action: "parcel.received",
    entityType: "Parcel",
    entityId: parcel.id,
    after: parcel,
  });

  await dispatchNotification(estateId, {
    residentId: resident.id,
    eventType: "parcel.arrived",
    title: "A parcel is waiting for you",
    body: `${input.carrier ? `${input.carrier}: ` : ""}${input.description} is at the gate for collection.`,
  });

  return parcel;
}

export async function listAwaitingParcels(estateId: string) {
  return prisma.parcel.findMany({
    where: { estateId, status: "AWAITING_COLLECTION" },
    include: parcelInclude,
    orderBy: { receivedAt: "asc" },
  });
}

export async function listParcelsForResident(estateId: string, residentId: string) {
  return prisma.parcel.findMany({
    where: { estateId, residentId },
    orderBy: { receivedAt: "desc" },
    take: 30,
  });
}

export async function countAwaitingParcelsForResident(estateId: string, residentId: string) {
  return prisma.parcel.count({ where: { estateId, residentId, status: "AWAITING_COLLECTION" } });
}

/** Security hands the parcel over — only an awaiting parcel in this estate can be closed out, and who collected it is recorded. */
export async function markParcelCollected(estateId: string, securityUserId: string, parcelId: string, collectedByName?: string) {
  const parcel = await prisma.parcel.findFirst({ where: { id: parcelId, estateId } });
  if (!parcel) throw new NotFoundError("Parcel");
  if (parcel.status !== "AWAITING_COLLECTION") throw new ForbiddenError("This parcel has already been closed out.");

  const updated = await prisma.parcel.update({
    where: { id: parcel.id },
    data: { status: "COLLECTED", collectedAt: new Date(), collectedByName: collectedByName || null },
  });

  await recordAudit({
    estateId,
    actorUserId: securityUserId,
    action: "parcel.collected",
    entityType: "Parcel",
    entityId: parcel.id,
    before: parcel,
    after: updated,
  });

  return updated;
}
