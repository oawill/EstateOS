import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { createProperty } from "../properties";
import { createGuest } from "../guests";
import { createReservation } from "../reservations";
import { createAvailabilityBlock } from "../availability";

describe("Shortlet double-booking prevention (integration)", () => {
  let estateId: string;
  let userId: string;
  let unitId: string;
  let guestAId: string;
  let guestBId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({ data: { name: "Double Booking Test", slug: `dbl-book-${randomUUID()}` } });
    estateId = estate.id;

    const user = await prisma.user.create({ data: { name: "Operator", email: `dbl-book-${randomUUID()}@example.com` } });
    userId = user.id;

    const property = await createProperty(estateId, userId, {
      name: "Overlap Test Property",
      propertyType: "APARTMENT",
      address: "1 Test Street",
      country: "Nigeria",
      city: "Lagos",
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      amenities: [],
      checkInTime: "15:00",
      checkOutTime: "11:00",
      baseNightlyRateMinor: 5000000,
      cleaningFeeMinor: 0,
      securityDepositMinor: 0,
      minStayNights: 1,
    });
    const units = await scoped(estateId).shortletUnit.findMany({ where: { propertyId: property.id } });
    unitId = units[0]!.id;

    const guestA = await createGuest(estateId, userId, { fullName: "Guest A", phone: "+2348000000001" });
    const guestB = await createGuest(estateId, userId, { fullName: "Guest B", phone: "+2348000000002" });
    guestAId = guestA.id;
    guestBId = guestB.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  function baseReservationInput(overrides: Partial<Parameters<typeof createReservation>[2]> = {}) {
    return {
      unitId,
      guestId: guestAId,
      checkInDate: new Date("2027-02-10"),
      checkOutDate: new Date("2027-02-15"),
      numberOfGuests: 1,
      nightlyRateMinor: 5000000,
      taxesMinor: 0,
      cleaningFeeMinor: 0,
      securityDepositMinor: 0,
      discountMinor: 0,
      additionalFeesMinor: 0,
      bookingSource: "DIRECT" as const,
      ...overrides,
    };
  }

  it("rejects a second reservation that overlaps an existing live reservation on the same unit", async () => {
    await createReservation(estateId, userId, baseReservationInput());

    await expect(
      createReservation(
        estateId,
        userId,
        baseReservationInput({ guestId: guestBId, checkInDate: new Date("2027-02-12"), checkOutDate: new Date("2027-02-18") }),
      ),
    ).rejects.toThrow(/already reserved/i);
  });

  it("allows a back-to-back reservation where the new check-in equals the prior check-out", async () => {
    const reservation = await createReservation(
      estateId,
      userId,
      baseReservationInput({ guestId: guestBId, checkInDate: new Date("2027-03-01"), checkOutDate: new Date("2027-03-05") }),
    );
    expect(reservation).toBeTruthy();

    const backToBack = await createReservation(
      estateId,
      userId,
      baseReservationInput({ guestId: guestAId, checkInDate: new Date("2027-03-05"), checkOutDate: new Date("2027-03-08") }),
    );
    expect(backToBack).toBeTruthy();
  });

  it("rejects a reservation that overlaps an owner-blocked availability window", async () => {
    await createAvailabilityBlock(estateId, userId, {
      unitId,
      startDate: new Date("2027-04-01"),
      endDate: new Date("2027-04-10"),
      reason: "OWNER_BLOCKED",
    });

    await expect(
      createReservation(
        estateId,
        userId,
        baseReservationInput({ checkInDate: new Date("2027-04-05"), checkOutDate: new Date("2027-04-07") }),
      ),
    ).rejects.toThrow(/already reserved or blocked/i);
  });
});
