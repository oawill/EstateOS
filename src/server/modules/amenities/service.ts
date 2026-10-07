import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { minutesOfDay, zonedToUtc } from "@/lib/zonedTime";
import { recordAudit } from "@/server/modules/audit";

const MAX_DAYS_AHEAD = 30;

export interface AmenityInput {
  name: string;
  description?: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  maxSlots: number;
  capacity: number;
  feeNote?: string;
}

export async function createAmenity(estateId: string, actorUserId: string, input: AmenityInput) {
  if (minutesOfDay(input.closeTime) <= minutesOfDay(input.openTime)) throw new ForbiddenError("Closing time must be after opening time.");

  const amenity = await prisma.amenity.create({
    data: {
      estateId,
      name: input.name,
      description: input.description || null,
      openTime: input.openTime,
      closeTime: input.closeTime,
      slotMinutes: input.slotMinutes,
      maxSlots: input.maxSlots,
      capacity: input.capacity,
      feeNote: input.feeNote || null,
    },
  });

  await recordAudit({ estateId, actorUserId, action: "amenity.created", entityType: "Amenity", entityId: amenity.id, after: amenity });
  return amenity;
}

export async function setAmenityActive(estateId: string, actorUserId: string, amenityId: string, isActive: boolean) {
  const before = await prisma.amenity.findFirst({ where: { id: amenityId, estateId } });
  if (!before) throw new NotFoundError("Amenity");
  const after = await prisma.amenity.update({ where: { id: amenityId }, data: { isActive } });
  await recordAudit({ estateId, actorUserId, action: isActive ? "amenity.activated" : "amenity.deactivated", entityType: "Amenity", entityId: amenityId, before, after });
  return after;
}

export async function listAmenities(estateId: string, opts: { includeInactive?: boolean } = {}) {
  return prisma.amenity.findMany({
    where: { estateId, ...(opts.includeInactive ? {} : { isActive: true }) },
    orderBy: { name: "asc" },
  });
}

/**
 * Books a slot. Everything is validated server-side against the amenity's own
 * rules and the estate's timezone: bookable amenity, whole number of slots
 * within the max, inside opening hours, in the future and not too far ahead,
 * under capacity for that window, and not double-booked by the same resident.
 */
export async function bookAmenity(
  estateId: string,
  residentId: string,
  input: { amenityId: string; date: string; startTime: string; slots: number },
) {
  const [amenity, estate] = await Promise.all([
    prisma.amenity.findFirst({ where: { id: input.amenityId, estateId, isActive: true } }),
    prisma.estate.findUniqueOrThrow({ where: { id: estateId }, select: { timezone: true } }),
  ]);
  if (!amenity) throw new NotFoundError("Amenity");
  if (!amenity.requiresBooking) throw new ForbiddenError("This facility doesn't need a booking.");
  if (!Number.isInteger(input.slots) || input.slots < 1 || input.slots > amenity.maxSlots) {
    throw new ForbiddenError(`You can book 1 to ${amenity.maxSlots} slot(s) at a time.`);
  }

  const durationMinutes = input.slots * amenity.slotMinutes;
  const startMin = minutesOfDay(input.startTime);
  if (
    (startMin - minutesOfDay(amenity.openTime)) % amenity.slotMinutes !== 0 ||
    startMin < minutesOfDay(amenity.openTime) ||
    startMin + durationMinutes > minutesOfDay(amenity.closeTime)
  ) {
    throw new ForbiddenError(`That time is outside opening hours (${amenity.openTime}–${amenity.closeTime}) or off the ${amenity.slotMinutes}-minute slot grid.`);
  }

  const startsAt = zonedToUtc(input.date, input.startTime, estate.timezone);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const now = new Date();
  if (startsAt <= now) throw new ForbiddenError("Choose a time in the future.");
  if (startsAt.getTime() > now.getTime() + MAX_DAYS_AHEAD * 86_400_000) throw new ForbiddenError(`Bookings open up to ${MAX_DAYS_AHEAD} days ahead.`);

  const booking = await prisma.$transaction(async (tx) => {
    // Serialise bookings per amenity: without this, simultaneous requests all
    // read the same "free" count and each insert, overbooking the slot.
    await tx.$queryRaw`SELECT id FROM "Amenity" WHERE id = ${amenity.id} FOR UPDATE`;
    const overlapping = await tx.amenityBooking.findMany({
      where: { amenityId: amenity.id, status: "CONFIRMED", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      select: { residentId: true },
    });
    if (overlapping.some((b) => b.residentId === residentId)) throw new ForbiddenError("You already have a booking at that time.");
    if (overlapping.length >= amenity.capacity) throw new ForbiddenError("That slot is already full — try another time.");

    return tx.amenityBooking.create({ data: { estateId, amenityId: amenity.id, residentId, startsAt, endsAt } });
  });

  await recordAudit({ estateId, actorUserId: null, action: "amenity.booked", entityType: "AmenityBooking", entityId: booking.id, after: booking });
  return booking;
}

export async function listBookingsForResident(estateId: string, residentId: string) {
  return prisma.amenityBooking.findMany({
    where: { estateId, residentId, status: "CONFIRMED", endsAt: { gt: new Date() } },
    include: { amenity: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });
}

/** A resident can only cancel their own, still-upcoming booking. */
export async function cancelBooking(estateId: string, residentId: string, bookingId: string) {
  const booking = await prisma.amenityBooking.findFirst({ where: { id: bookingId, estateId, residentId } });
  if (!booking) throw new NotFoundError("Booking");
  if (booking.status !== "CONFIRMED" || booking.startsAt <= new Date()) throw new ForbiddenError("This booking can't be cancelled any more.");
  return prisma.amenityBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
}

export async function listUpcomingBookings(estateId: string) {
  return prisma.amenityBooking.findMany({
    where: { estateId, status: "CONFIRMED", endsAt: { gt: new Date() } },
    include: { amenity: { select: { name: true } }, resident: { select: { firstName: true, lastName: true } } },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
}
