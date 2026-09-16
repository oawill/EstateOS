import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess, getAuthorizedPropertyIds } from "./access";
import { isRangeAvailable } from "./availability";
import { findOrCreateGuest } from "./guest";
import { calculateAccommodationTotal } from "./ratePlan";
import { nextBookingReference } from "./sequence";
import type { CreateBookingInput, RecordBookingPaymentInput } from "./schema";

/**
 * Creates a booking end-to-end: re-validates availability inside the same
 * write path (never trusts a client-side calendar check alone), snapshots
 * whatever rate plan applies today onto the booking's own fields, and
 * writes the itemized BookingCharge rows that back the booking's
 * totalAmountMinor — so the financial record never has to be
 * reconstructed later from a rate plan that may have since changed.
 */
export async function createBooking(actor: CurrentUser | null, input: CreateBookingInput) {
  const listing = await prisma.shortletListing.findUnique({
    where: { id: input.listingId },
    include: { ratePlans: true },
  });
  if (!listing) throw new NotFoundError("Listing");
  if (actor) await assertPropertyAccess(actor, listing.propertyId);
  if (listing.status !== "ACTIVE") throw new ForbiddenError("This listing is not currently accepting bookings");

  if (input.checkOutDate <= input.checkInDate) throw new ForbiddenError("Check-out must be after check-in");

  const { totalMinor: accommodationMinor, nights, averageNightlyRateMinor } = calculateAccommodationTotal(
    input.checkInDate,
    input.checkOutDate,
    listing.baseNightlyRateMinor,
    listing.ratePlans,
  );

  if (nights < listing.minStayNights) throw new ForbiddenError(`This listing requires a minimum stay of ${listing.minStayNights} nights`);
  if (listing.maxStayNights && nights > listing.maxStayNights) {
    throw new ForbiddenError(`This listing allows a maximum stay of ${listing.maxStayNights} nights`);
  }
  if (input.numberOfGuests > listing.maxGuests) throw new ForbiddenError(`This listing sleeps a maximum of ${listing.maxGuests} guests`);

  if (!(await isRangeAvailable(input.listingId, input.checkInDate, input.checkOutDate))) {
    throw new ForbiddenError("These dates are not available for this listing");
  }

  const guest = await findOrCreateGuest({
    userId: actor?.id,
    fullName: input.guest.fullName,
    email: input.guest.email,
    phone: input.guest.phone,
    whatsapp: input.guest.whatsapp,
    country: input.guest.country,
  });

  const totalAmountMinor =
    accommodationMinor + listing.cleaningFeeMinor + input.additionalFeesMinor - input.discountMinor;
  const bookingReference = await nextBookingReference();

  const booking = await prisma.$transaction(async (tx) => {
    const booking = await tx.shortletBooking.create({
      data: {
        bookingReference,
        listingId: input.listingId,
        guestId: guest.id,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        numberOfGuests: input.numberOfGuests,
        nights,
        nightlyRateMinor: averageNightlyRateMinor,
        cleaningFeeMinor: listing.cleaningFeeMinor,
        securityDepositMinor: listing.securityDepositMinor,
        discountMinor: input.discountMinor,
        additionalFeesMinor: input.additionalFeesMinor,
        totalAmountMinor,
        bookingSource: input.bookingSource,
        notes: input.notes || null,
        createdByUserId: actor?.id ?? null,
        status: "PENDING",
      },
    });

    const charges: { type: "ACCOMMODATION" | "CLEANING_FEE" | "ADDITIONAL_GUEST_FEE" | "DISCOUNT"; description: string; amountMinor: number }[] = [
      { type: "ACCOMMODATION", description: `${nights} night(s) accommodation`, amountMinor: accommodationMinor },
    ];
    if (listing.cleaningFeeMinor > 0) charges.push({ type: "CLEANING_FEE", description: "Cleaning fee", amountMinor: listing.cleaningFeeMinor });
    if (input.additionalFeesMinor > 0) charges.push({ type: "ADDITIONAL_GUEST_FEE", description: "Additional fees", amountMinor: input.additionalFeesMinor });
    if (input.discountMinor > 0) charges.push({ type: "DISCOUNT", description: "Discount", amountMinor: input.discountMinor });

    await tx.bookingCharge.createMany({ data: charges.map((c) => ({ ...c, bookingId: booking.id })) });

    return booking;
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor?.id ?? null,
    action: "shortlet_management.booking.created",
    entityType: "ShortletBooking",
    entityId: booking.id,
    after: booking,
  });

  return booking;
}

/** Security deposit is tracked as its own line item but never counted as revenue in any total shown to the operator/owner — see the analytics/statement layer once built. */
export async function recordBookingPayment(actor: CurrentUser, input: RecordBookingPaymentInput) {
  const booking = await prisma.shortletBooking.findUnique({ where: { id: input.bookingId }, include: { listing: true } });
  if (!booking) throw new NotFoundError("Booking");
  await assertPropertyAccess(actor, booking.listing.propertyId);
  if (["CANCELLED", "NO_SHOW"].includes(booking.status)) throw new ForbiddenError("Cannot record a payment against a cancelled booking");

  const payment = await prisma.$transaction(async (tx) => {
    const payment = await tx.bookingPayment.create({
      data: {
        bookingId: input.bookingId,
        amountMinor: input.amountMinor,
        method: input.method,
        paidAt: input.paidAt ?? new Date(),
        transactionRef: input.transactionRef || null,
        notes: input.notes || null,
        recordedByUserId: actor.id,
        status: "COMPLETED",
      },
    });

    const newAmountPaidMinor = booking.amountPaidMinor + input.amountMinor;
    const shouldConfirm = ["PENDING", "AWAITING_PAYMENT"].includes(booking.status) && newAmountPaidMinor >= booking.totalAmountMinor;

    await tx.shortletBooking.update({
      where: { id: input.bookingId },
      data: { amountPaidMinor: newAmountPaidMinor, status: shouldConfirm ? "CONFIRMED" : undefined },
    });

    return payment;
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.booking.payment_recorded",
    entityType: "BookingPayment",
    entityId: payment.id,
    after: payment,
  });

  return payment;
}

export async function checkInBooking(actor: CurrentUser, bookingId: string) {
  const booking = await prisma.shortletBooking.findUnique({ where: { id: bookingId }, include: { listing: true } });
  if (!booking) throw new NotFoundError("Booking");
  await assertPropertyAccess(actor, booking.listing.propertyId);
  if (booking.status !== "CONFIRMED") throw new ForbiddenError("Only a confirmed booking can be checked in");

  const updated = await prisma.shortletBooking.update({
    where: { id: bookingId },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.booking.checked_in",
    entityType: "ShortletBooking",
    entityId: bookingId,
    after: updated,
  });

  return updated;
}

export async function checkOutBooking(actor: CurrentUser, bookingId: string) {
  const booking = await prisma.shortletBooking.findUnique({ where: { id: bookingId }, include: { listing: true } });
  if (!booking) throw new NotFoundError("Booking");
  await assertPropertyAccess(actor, booking.listing.propertyId);
  if (booking.status !== "CHECKED_IN") throw new ForbiddenError("Only a checked-in booking can be checked out");

  const updated = await prisma.shortletBooking.update({
    where: { id: bookingId },
    data: { status: "CHECKED_OUT", checkedOutAt: new Date() },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.booking.checked_out",
    entityType: "ShortletBooking",
    entityId: bookingId,
    after: updated,
  });

  return updated;
}

export async function cancelBooking(actor: CurrentUser, bookingId: string, reason: string) {
  const booking = await prisma.shortletBooking.findUnique({ where: { id: bookingId }, include: { listing: true } });
  if (!booking) throw new NotFoundError("Booking");
  await assertPropertyAccess(actor, booking.listing.propertyId);
  if (["CHECKED_OUT", "COMPLETED", "CANCELLED"].includes(booking.status)) {
    throw new ForbiddenError(`A ${booking.status.toLowerCase()} booking cannot be cancelled`);
  }

  const updated = await prisma.shortletBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", notes: booking.notes ? `${booking.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}` },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "shortlet_management.booking.cancelled",
    entityType: "ShortletBooking",
    entityId: bookingId,
    before: booking,
    after: updated,
  });

  return updated;
}

export async function listBookingsForListing(actor: CurrentUser, listingId: string) {
  const listing = await prisma.shortletListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError("Listing");
  await assertPropertyAccess(actor, listing.propertyId);

  return prisma.shortletBooking.findMany({
    where: { listingId },
    include: { guest: true },
    orderBy: { checkInDate: "desc" },
  });
}

export async function listAccessibleBookings(user: CurrentUser) {
  const propertyIds = await getAuthorizedPropertyIds(user);
  return prisma.shortletBooking.findMany({
    where: { listing: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } },
    include: { listing: { include: { unit: true, property: true } }, guest: true },
    orderBy: { checkInDate: "desc" },
  });
}

export async function getBookingDetail(actor: CurrentUser, bookingId: string) {
  const booking = await prisma.shortletBooking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { include: { unit: true, property: true } },
      guest: true,
      charges: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      additionalGuests: true,
    },
  });
  if (!booking) throw new NotFoundError("Booking");
  await assertPropertyAccess(actor, booking.listing.propertyId);
  return booking;
}

export async function getBookingByReference(bookingReference: string) {
  const booking = await prisma.shortletBooking.findUnique({
    where: { bookingReference },
    include: { listing: true, guest: true, payments: true },
  });
  if (!booking) throw new NotFoundError("Booking");
  return booking;
}
