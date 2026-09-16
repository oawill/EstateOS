import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";
import { createOrGetOwnProfile, createManagedProperty, createRentalUnit } from "@/server/modules/tenantManagement/property";
import { createOrGetOwnOperatorProfile, assignShortletOperator } from "../operator";
import { createShortletListing, searchPublicListings, getPublicListingByReference } from "../listing";
import { createRatePlan } from "../ratePlan";
import { createAvailabilityBlock, createOwnerStay, isRangeAvailable } from "../availability";
import { createBooking, recordBookingPayment, checkInBooking, checkOutBooking, cancelBooking } from "../booking";

function actorFor(userId: string): CurrentUser {
  return { id: userId, email: null, name: "Test User", isPlatformAdmin: false };
}

async function makeUser(label: string, email?: string) {
  return prisma.user.create({ data: { name: label, email: email ?? `sm-${label}-${randomUUID()}@example.com` } });
}

/** Owner + property + unit + operator profile + operator granted access + a published listing — every test in this file needs this scaffold. */
async function setupListing(label: string, opts: { baseNightlyRateMinor: number; minStayNights?: number; maxGuests?: number }) {
  const ownerUser = await makeUser(`${label}-owner`);
  const owner = await createOrGetOwnProfile(ownerUser.id, { name: `Owner ${label}`, preferredCurrency: "NGN" });
  const ownerActor = actorFor(ownerUser.id);

  const property = await createManagedProperty(ownerActor, {
    ownerId: owner.id,
    name: `Property ${label}`,
    addressLine: "1 Test Close",
    city: "Lagos",
    country: "NG",
    propertyType: "FLAT",
  });
  const unit = await createRentalUnit(ownerActor, {
    propertyId: property.id,
    label: "Unit S1",
    rentAmountMinor: 1,
    rentFrequency: "ANNUAL",
    serviceChargeMinor: 0,
    securityDepositMinor: 0,
  });

  const operatorUser = await makeUser(`${label}-operator`);
  const operatorActor = actorFor(operatorUser.id);
  await createOrGetOwnOperatorProfile(operatorUser.id, { name: `Operator ${label}` });
  await assignShortletOperator(ownerActor, { propertyId: property.id, operatorEmail: operatorUser.email! });

  const listing = await createShortletListing(operatorActor, {
    unitId: unit.id,
    title: `Listing ${label}`,
    description: "A nice stay",
    maxGuests: opts.maxGuests ?? 4,
    amenities: [],
    imageUrls: [],
    checkInTime: "15:00",
    checkOutTime: "11:00",
    baseNightlyRateMinor: opts.baseNightlyRateMinor,
    cleaningFeeMinor: 10_000_00,
    securityDepositMinor: 50_000_00,
    minStayNights: opts.minStayNights ?? 1,
  });

  return { ownerUserId: ownerUser.id, operatorUserId: operatorUser.id, ownerActor, operatorActor, property, unit, listing };
}

describe("Shortlet Management booking engine (integration)", () => {
  const cleanupUserIds: string[] = [];
  afterAll(async () => {
    for (const id of cleanupUserIds) await prisma.user.deleteMany({ where: { id } });
  });

  it("runs listing publish -> booking -> payment -> check-in -> check-out, with correct pricing and public privacy", async () => {
    const { ownerUserId, operatorUserId, operatorActor, listing } = await setupListing("full-flow", { baseNightlyRateMinor: 100_000_00 });
    cleanupUserIds.push(ownerUserId, operatorUserId);

    expect(listing.status).toBe("DRAFT");
    expect(listing.listingReference).toMatch(/^NQS-\d{4}-\d{6}$/);

    const { updateListingStatus } = await import("../listing");
    await updateListingStatus(operatorActor, listing.id, "ACTIVE");

    // Public marketplace never leaks operator/owner/unit identity.
    const publicListing = await getPublicListingByReference(listing.listingReference);
    expect(publicListing).not.toHaveProperty("operatorId");
    expect(publicListing).not.toHaveProperty("unitId");
    const results = await searchPublicListings({});
    expect(results.some((l) => l.listingReference === listing.listingReference)).toBe(true);

    const booking = await createBooking(operatorActor, {
      listingId: listing.id,
      guest: { fullName: "Guest One", email: "guest-full-flow@example.com" },
      checkInDate: new Date("2026-03-01"),
      checkOutDate: new Date("2026-03-04"),
      numberOfGuests: 2,
      bookingSource: "DIRECT",
      discountMinor: 0,
      additionalFeesMinor: 0,
    });

    expect(booking.bookingReference).toMatch(/^NQB-\d{4}-\d{6}$/);
    expect(booking.nights).toBe(3);
    // 3 nights x 100,000.00 + cleaning 10,000.00 = 310,000.00 (in minor units)
    expect(booking.totalAmountMinor).toBe(3 * 100_000_00 + 10_000_00);
    expect(booking.status).toBe("PENDING");

    // Security deposit is tracked but never folded into totalAmountMinor.
    expect(booking.securityDepositMinor).toBe(50_000_00);

    await recordBookingPayment(operatorActor, {
      bookingId: booking.id,
      amountMinor: 100, // partial — well short of the total
      method: "BANK_TRANSFER",
    });
    const afterPartial = await prisma.shortletBooking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(afterPartial.status).toBe("PENDING");

    await recordBookingPayment(operatorActor, {
      bookingId: booking.id,
      amountMinor: booking.totalAmountMinor - 100,
      method: "BANK_TRANSFER",
    });
    const afterFull = await prisma.shortletBooking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(afterFull.status).toBe("CONFIRMED");
    expect(afterFull.amountPaidMinor).toBe(booking.totalAmountMinor);

    await expect(checkOutBooking(operatorActor, booking.id)).rejects.toThrow(ForbiddenError);

    const checkedIn = await checkInBooking(operatorActor, booking.id);
    expect(checkedIn.status).toBe("CHECKED_IN");
    expect(checkedIn.checkedInAt).not.toBeNull();

    const checkedOut = await checkOutBooking(operatorActor, booking.id);
    expect(checkedOut.status).toBe("CHECKED_OUT");
    expect(checkedOut.checkedOutAt).not.toBeNull();

    // Guest is a ShortletGuest, never a Tenant.
    const tenantWithThisEmail = await prisma.tenant.findFirst({ where: { email: "guest-full-flow@example.com" } });
    expect(tenantWithThisEmail).toBeNull();
    const guest = await prisma.shortletGuest.findFirstOrThrow({ where: { email: "guest-full-flow@example.com" } });
    expect(guest.fullName).toBe("Guest One");
  });

  it("prevents overlapping confirmed bookings, enforces weekend rate plans, and honors owner stays/manual blocks", async () => {
    const { ownerUserId, operatorUserId, operatorActor, listing } = await setupListing("overlap", { baseNightlyRateMinor: 50_000_00 });
    cleanupUserIds.push(ownerUserId, operatorUserId);

    const { updateListingStatus } = await import("../listing");
    await updateListingStatus(operatorActor, listing.id, "ACTIVE");

    // Friday/Saturday weekend rate plan.
    await createRatePlan(operatorActor, {
      listingId: listing.id,
      type: "WEEKEND",
      daysOfWeek: [5, 6],
      nightlyRateMinor: 80_000_00,
    });

    // 2026-03-06 is a Friday, 2026-03-07 a Saturday, 2026-03-08 a Sunday.
    const bookingA = await createBooking(operatorActor, {
      listingId: listing.id,
      guest: { fullName: "Guest A" },
      checkInDate: new Date("2026-03-06"),
      checkOutDate: new Date("2026-03-09"),
      numberOfGuests: 1,
      bookingSource: "DIRECT",
      discountMinor: 0,
      additionalFeesMinor: 0,
    });
    // Fri (weekend 80k) + Sat (weekend 80k) + Sun (base 50k) + cleaning 10k
    expect(bookingA.totalAmountMinor).toBe(80_000_00 + 80_000_00 + 50_000_00 + 10_000_00);

    await expect(
      createBooking(operatorActor, {
        listingId: listing.id,
        guest: { fullName: "Guest B" },
        checkInDate: new Date("2026-03-07"),
        checkOutDate: new Date("2026-03-10"),
        numberOfGuests: 1,
        bookingSource: "DIRECT",
        discountMinor: 0,
        additionalFeesMinor: 0,
      }),
    ).rejects.toThrow(ForbiddenError);

    // Cancelling frees the calendar back up.
    await cancelBooking(operatorActor, bookingA.id, "Guest requested cancellation");
    expect(await isRangeAvailable(listing.id, new Date("2026-03-06"), new Date("2026-03-09"))).toBe(true);

    // A manual block and an owner stay both count as unavailable, independent of any booking.
    await createAvailabilityBlock(operatorActor, {
      listingId: listing.id,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-05"),
      reason: "MAINTENANCE",
    });
    expect(await isRangeAvailable(listing.id, new Date("2026-04-02"), new Date("2026-04-03"))).toBe(false);

    await createOwnerStay(operatorActor, {
      listingId: listing.id,
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-05-03"),
    });
    expect(await isRangeAvailable(listing.id, new Date("2026-05-01"), new Date("2026-05-02"))).toBe(false);

    await expect(
      createBooking(operatorActor, {
        listingId: listing.id,
        guest: { fullName: "Guest C" },
        checkInDate: new Date("2026-05-01"),
        checkOutDate: new Date("2026-05-02"),
        numberOfGuests: 1,
        bookingSource: "DIRECT",
        discountMinor: 0,
        additionalFeesMinor: 0,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("enforces minimum stay and maximum guest count", async () => {
    const { ownerUserId, operatorUserId, operatorActor, listing } = await setupListing("limits", {
      baseNightlyRateMinor: 20_000_00,
      minStayNights: 3,
      maxGuests: 2,
    });
    cleanupUserIds.push(ownerUserId, operatorUserId);

    const { updateListingStatus } = await import("../listing");
    await updateListingStatus(operatorActor, listing.id, "ACTIVE");

    await expect(
      createBooking(operatorActor, {
        listingId: listing.id,
        guest: { fullName: "Guest Short Stay" },
        checkInDate: new Date("2026-06-01"),
        checkOutDate: new Date("2026-06-02"),
        numberOfGuests: 1,
        bookingSource: "DIRECT",
        discountMinor: 0,
        additionalFeesMinor: 0,
      }),
    ).rejects.toThrow(ForbiddenError);

    await expect(
      createBooking(operatorActor, {
        listingId: listing.id,
        guest: { fullName: "Guest Too Many" },
        checkInDate: new Date("2026-06-01"),
        checkOutDate: new Date("2026-06-04"),
        numberOfGuests: 5,
        bookingSource: "DIRECT",
        discountMinor: 0,
        additionalFeesMinor: 0,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("keeps operator access scoped to assigned properties only", async () => {
    const { ownerUserId: ownerAId, operatorUserId: operatorAId, listing: listingA } = await setupListing("tenant-iso-a", {
      baseNightlyRateMinor: 30_000_00,
    });
    const { ownerUserId: ownerBId, operatorUserId: operatorBId, operatorActor: operatorBActor } = await setupListing("tenant-iso-b", {
      baseNightlyRateMinor: 30_000_00,
    });
    cleanupUserIds.push(ownerAId, operatorAId, ownerBId, operatorBId);

    const { updateListingStatus } = await import("../listing");
    await expect(updateListingStatus(operatorBActor, listingA.id, "ACTIVE")).rejects.toThrow();
  });
});
