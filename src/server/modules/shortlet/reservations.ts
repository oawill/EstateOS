import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { recordAudit } from "@/server/modules/audit";
import { formatSequenceCode, nextSequenceNumber } from "@/server/modules/sequence";
import { NotFoundError } from "@/lib/errors";
import { hasOverlap } from "./availability";
import { createHousekeepingTask } from "./housekeeping";
import type { CreateReservationInput } from "./schema";

export function nightsBetween(checkInDate: Date, checkOutDate: Date): number {
  const msPerNight = 24 * 60 * 60 * 1000;
  return Math.round((checkOutDate.getTime() - checkInDate.getTime()) / msPerNight);
}

export function computeTotalAmountMinor(input: {
  nightlyRateMinor: number;
  nights: number;
  taxesMinor: number;
  cleaningFeeMinor: number;
  securityDepositMinor: number;
  discountMinor: number;
  additionalFeesMinor: number;
}): number {
  return (
    input.nightlyRateMinor * input.nights +
    input.taxesMinor +
    input.cleaningFeeMinor +
    input.securityDepositMinor +
    input.additionalFeesMinor -
    input.discountMinor
  );
}

export function outstandingAmountMinor(reservation: { totalAmountMinor: number; amountPaidMinor: number }): number {
  return reservation.totalAmountMinor - reservation.amountPaidMinor;
}

const reservationWithRelations = Prisma.validator<Prisma.ReservationDefaultArgs>()({
  include: { unit: { include: { property: true } }, guest: true },
});
export type ReservationWithRelations = Prisma.ReservationGetPayload<typeof reservationWithRelations>;

export async function listReservations(
  estateId: string,
  filter?: { status?: ReservationStatus; propertyId?: string; unitId?: string; from?: Date; to?: Date },
) {
  return scoped(estateId).reservation.findMany<ReservationWithRelations>({
    where: {
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.unitId ? { unitId: filter.unitId } : {}),
      ...(filter?.propertyId ? { unit: { propertyId: filter.propertyId } } : {}),
      ...(filter?.from || filter?.to
        ? {
            checkInDate: filter?.to ? { lt: filter.to } : undefined,
            checkOutDate: filter?.from ? { gt: filter.from } : undefined,
          }
        : {}),
    } as never,
    orderBy: { checkInDate: "desc" },
    include: reservationWithRelations.include,
  });
}

export async function getReservation(estateId: string, reservationId: string) {
  const reservation = await scoped(estateId).reservation.findById<ReservationWithRelations>(reservationId, {
    include: reservationWithRelations.include,
  });
  if (!reservation) throw new NotFoundError("Reservation");
  return reservation;
}

export async function createReservation(estateId: string, actorUserId: string, input: CreateReservationInput) {
  const nights = nightsBetween(input.checkInDate, input.checkOutDate);
  const totalAmountMinor = computeTotalAmountMinor({ ...input, nights });

  const reservation = await prisma.$transaction(async (tx) => {
    if (await hasOverlap(tx, estateId, input.unitId, input.checkInDate, input.checkOutDate)) {
      throw new Error("This unit is already reserved or blocked for part of that date range");
    }

    const seq = await nextSequenceNumber(tx, estateId, "shortlet-reservation");

    return tx.reservation.create({
      data: {
        estateId,
        reservationNumber: formatSequenceCode("RES", seq),
        unitId: input.unitId,
        guestId: input.guestId,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        numberOfGuests: input.numberOfGuests,
        nightlyRateMinor: input.nightlyRateMinor,
        nights,
        taxesMinor: input.taxesMinor,
        cleaningFeeMinor: input.cleaningFeeMinor,
        securityDepositMinor: input.securityDepositMinor,
        discountMinor: input.discountMinor,
        additionalFeesMinor: input.additionalFeesMinor,
        totalAmountMinor,
        bookingSource: input.bookingSource,
        notes: input.notes || null,
        createdByUserId: actorUserId,
      },
    });
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.reservation_created",
    entityType: "Reservation",
    entityId: reservation.id,
    after: reservation,
  });

  return reservation;
}

const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  [ReservationStatus.INQUIRY]: [ReservationStatus.PENDING, ReservationStatus.CANCELLED],
  [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [ReservationStatus.CHECKED_IN, ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
  [ReservationStatus.CHECKED_IN]: [ReservationStatus.CHECKED_OUT],
  [ReservationStatus.CHECKED_OUT]: [],
  [ReservationStatus.CANCELLED]: [],
  [ReservationStatus.NO_SHOW]: [],
};

/** Single transition function for every status change, mirroring maintenance's transitionTicket() shape. */
export async function updateReservationStatus(
  estateId: string,
  actorUserId: string,
  reservationId: string,
  status: ReservationStatus,
) {
  const reservation = await scoped(estateId).reservation.findById(reservationId);
  if (!reservation) throw new NotFoundError("Reservation");

  if (!VALID_TRANSITIONS[reservation.status].includes(status)) {
    throw new Error(`Can't move a reservation from ${reservation.status} to ${status}`);
  }

  const updated = await scoped(estateId).reservation.update(reservationId, { status });

  await recordAudit({
    estateId,
    actorUserId,
    action: "shortlet.reservation_transitioned",
    entityType: "Reservation",
    entityId: reservationId,
    before: { status: reservation.status },
    after: { status: updated.status },
  });

  // "Guest checks out -> unit becomes Cleaning Required -> cleaning task
  // created" — a direct call here, not a generic automation/event system,
  // per the brief's own "avoid unnecessary automation complexity" caution.
  if (status === ReservationStatus.CHECKED_OUT) {
    await createHousekeepingTask(estateId, actorUserId, { unitId: reservation.unitId });
  }

  return updated;
}
