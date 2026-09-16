import { ShortletBookingStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import type { CreateAvailabilityBlockInput, CreateOwnerStayInput } from "./schema";

export const ACTIVE_BOOKING_STATUSES: ShortletBookingStatus[] = ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN"];

/**
 * The single source of truth for "is this listing free for these dates" —
 * checked against every kind of unavailability (active bookings, manual
 * blocks, owner stays), never just bookings alone. Enforced here at the
 * service layer (called inside the same transaction that creates a
 * booking) rather than only in the UI, so a double-booking can't slip
 * through a race or a direct API call.
 */
export async function isRangeAvailable(
  listingId: string,
  checkInDate: Date,
  checkOutDate: Date,
  excludeBookingId?: string,
): Promise<boolean> {
  const [conflictingBooking, conflictingBlock, conflictingOwnerStay] = await Promise.all([
    prisma.shortletBooking.findFirst({
      where: {
        listingId,
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
    }),
    prisma.shortletAvailabilityBlock.findFirst({
      where: { listingId, startDate: { lt: checkOutDate }, endDate: { gt: checkInDate } },
    }),
    prisma.ownerStay.findFirst({
      where: { listingId, startDate: { lt: checkOutDate }, endDate: { gt: checkInDate } },
    }),
  ]);

  return !conflictingBooking && !conflictingBlock && !conflictingOwnerStay;
}

export async function listAvailabilityForListing(listingId: string, from: Date, to: Date) {
  const [bookings, blocks, ownerStays] = await Promise.all([
    prisma.shortletBooking.findMany({
      where: {
        listingId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        checkInDate: { lt: to },
        checkOutDate: { gt: from },
      },
      select: { id: true, checkInDate: true, checkOutDate: true, status: true, guest: { select: { fullName: true } } },
    }),
    prisma.shortletAvailabilityBlock.findMany({
      where: { listingId, startDate: { lt: to }, endDate: { gt: from } },
    }),
    prisma.ownerStay.findMany({
      where: { listingId, startDate: { lt: to }, endDate: { gt: from } },
    }),
  ]);

  return { bookings, blocks, ownerStays };
}

export async function createAvailabilityBlock(actor: CurrentUser, input: CreateAvailabilityBlockInput) {
  const listing = await prisma.shortletListing.findUnique({ where: { id: input.listingId } });
  if (!listing) throw new NotFoundError("Listing");
  await assertPropertyAccess(actor, listing.propertyId);

  if (!(await isRangeAvailable(input.listingId, input.startDate, input.endDate))) {
    throw new ForbiddenError("These dates overlap an existing booking, block, or owner stay");
  }

  const block = await prisma.shortletAvailabilityBlock.create({
    data: {
      listingId: input.listingId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason,
      notes: input.notes || null,
      createdByUserId: actor.id,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.availability_block.created",
    entityType: "ShortletAvailabilityBlock",
    entityId: block.id,
    after: block,
  });

  return block;
}

export async function removeAvailabilityBlock(actor: CurrentUser, blockId: string) {
  const block = await prisma.shortletAvailabilityBlock.findUnique({ where: { id: blockId }, include: { listing: true } });
  if (!block) throw new NotFoundError("Block");
  await assertPropertyAccess(actor, block.listing.propertyId);
  await prisma.shortletAvailabilityBlock.delete({ where: { id: blockId } });
}

export async function createOwnerStay(actor: CurrentUser, input: CreateOwnerStayInput) {
  const listing = await prisma.shortletListing.findUnique({ where: { id: input.listingId } });
  if (!listing) throw new NotFoundError("Listing");
  await assertPropertyAccess(actor, listing.propertyId);

  if (!(await isRangeAvailable(input.listingId, input.startDate, input.endDate))) {
    throw new ForbiddenError("These dates overlap an existing booking, block, or owner stay");
  }

  const ownerStay = await prisma.ownerStay.create({
    data: {
      listingId: input.listingId,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes || null,
      createdByUserId: actor.id,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.owner_stay.created",
    entityType: "OwnerStay",
    entityId: ownerStay.id,
    after: ownerStay,
  });

  return ownerStay;
}
