import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { scoped, TenantScopeError } from "@/server/db/scoped";
import { createProperty } from "../properties";
import { createGuest } from "../guests";
import { createReservation } from "../reservations";

/**
 * Every Shortlet record must be tenant-scoped server-side, same as every
 * other module in this app (see the Community precedent this test mirrors).
 * A request from Estate A for Estate B's shortlet data must come back
 * not-found, never leak across the boundary.
 */
describe("Shortlet tenant isolation (integration)", () => {
  let estateAId: string;
  let estateBId: string;
  let userAId: string;

  beforeAll(async () => {
    const estateA = await prisma.estate.create({ data: { name: "Shortlet Isolation A", slug: `shortlet-iso-a-${randomUUID()}` } });
    const estateB = await prisma.estate.create({ data: { name: "Shortlet Isolation B", slug: `shortlet-iso-b-${randomUUID()}` } });
    estateAId = estateA.id;
    estateBId = estateB.id;

    const userA = await prisma.user.create({ data: { name: "Operator A", email: `shortlet-iso-a-${randomUUID()}@example.com` } });
    userAId = userA.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateAId } });
    await prisma.estate.delete({ where: { id: estateBId } });
    await prisma.user.delete({ where: { id: userAId } });
  });

  async function makeProperty(estateId: string) {
    return createProperty(estateId, userAId, {
      name: "Test Property",
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
  }

  it("scoped() findMany/findById never returns another estate's property, and update() throws for a cross-estate id", async () => {
    const property = await makeProperty(estateAId);

    const bProperties = await scoped(estateBId).shortletProperty.findMany();
    expect(bProperties.find((p) => p.id === property.id)).toBeUndefined();

    expect(await scoped(estateBId).shortletProperty.findById(property.id)).toBeNull();

    await expect(scoped(estateBId).shortletProperty.update(property.id, { name: "hijacked" })).rejects.toThrow(TenantScopeError);
  });

  it("scoped() isolation holds for reservations and guests", async () => {
    const property = await makeProperty(estateAId);
    const units = await scoped(estateAId).shortletUnit.findMany({ where: { propertyId: property.id } });
    const unit = units[0]!;
    const guest = await createGuest(estateAId, userAId, { fullName: "Test Guest", phone: "+2348000000000" });

    const reservation = await createReservation(estateAId, userAId, {
      unitId: unit.id,
      guestId: guest.id,
      checkInDate: new Date("2027-01-01"),
      checkOutDate: new Date("2027-01-03"),
      numberOfGuests: 1,
      nightlyRateMinor: 5000000,
      taxesMinor: 0,
      cleaningFeeMinor: 0,
      securityDepositMinor: 0,
      discountMinor: 0,
      additionalFeesMinor: 0,
      bookingSource: "DIRECT",
    });

    expect(await scoped(estateBId).reservation.findById(reservation.id)).toBeNull();
    expect(await scoped(estateBId).guest.findById(guest.id)).toBeNull();
    await expect(scoped(estateBId).reservation.update(reservation.id, { notes: "hijacked" })).rejects.toThrow(TenantScopeError);
  });
});
