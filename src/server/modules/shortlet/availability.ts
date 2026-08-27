import { ReservationStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { recordAudit } from "@/server/modules/audit";
import { NotFoundError } from "@/lib/errors";
import type { CreateAvailabilityBlockInput } from "./schema";

// A reservation that's still live enough to hold the unit. CANCELLED/
// NO_SHOW/CHECKED_OUT/INQUIRY don't block — an inquiry is just an interest,
// not a hold (same "logical invariant, not a DB constraint" style as the
// visitor-pass PIN uniqueness check elsewhere in this codebase).
const BLOCKING_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
];

type TxClient = Pick<typeof prisma, "reservation" | "availabilityBlock">;

/** True if [startDate, endDate) overlaps any live reservation or manual block on this unit. */
export async function hasOverlap(
  tx: TxClient,
  estateId: string,
  unitId: string,
  startDate: Date,
  endDate: Date,
  excludeReservationId?: string,
): Promise<boolean> {
  const [conflictingReservation, conflictingBlock] = await Promise.all([
    tx.reservation.findFirst({
      where: {
        estateId,
        unitId,
        status: { in: BLOCKING_RESERVATION_STATUSES },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
        checkInDate: { lt: endDate },
        checkOutDate: { gt: startDate },
      },
    }),
    tx.availabilityBlock.findFirst({
      where: { estateId, unitId, startDate: { lt: endDate }, endDate: { gt: startDate } },
    }),
  ]);

  return Boolean(conflictingReservation || conflictingBlock);
}

export async function listAvailabilityForUnit(estateId: string, unitId: string) {
  return scoped(estateId).availabilityBlock.findMany({
    where: { unitId } as never,
    orderBy: { startDate: "asc" },
  });
}

/** For the portfolio calendar — every block overlapping [from, to). */
export async function listAvailabilityBlocksInRange(estateId: string, from: Date, to: Date) {
  return scoped(estateId).availabilityBlock.findMany({
    where: { startDate: { lt: to }, endDate: { gt: from } } as never,
    orderBy: { startDate: "asc" },
  });
}

export async function createAvailabilityBlock(estateId: string, actorUserId: string, input: CreateAvailabilityBlockInput) {
  const block = await prisma.$transaction(async (tx) => {
    if (await hasOverlap(tx, estateId, input.unitId, input.startDate, input.endDate)) {
      throw new Error("This unit already has a reservation or block in that date range");
    }

    return tx.availabilityBlock.create({
      data: {
        estateId,
        unitId: input.unitId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        notes: input.notes || null,
        createdByUserId: actorUserId,
      },
    });
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.availability_blocked",
    entityType: "AvailabilityBlock",
    entityId: block.id,
    after: block,
  });

  return block;
}

export async function removeAvailabilityBlock(estateId: string, actorUserId: string, blockId: string) {
  const before = await scoped(estateId).availabilityBlock.findById(blockId);
  if (!before) throw new NotFoundError("Availability block");

  await scoped(estateId).availabilityBlock.remove(blockId);

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.availability_unblocked",
    entityType: "AvailabilityBlock",
    entityId: blockId,
    before,
  });
}
