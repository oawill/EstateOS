import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { createProperty } from "../properties";
import { createGuest } from "../guests";
import { createReservation, updateReservationStatus } from "../reservations";
import { listHousekeepingTasks, hasOpenHousekeepingTask, updateHousekeepingTask } from "../housekeeping";

describe("Housekeeping auto-creation on checkout (integration)", () => {
  let estateId: string;
  let userId: string;
  let unitId: string;
  let guestId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({ data: { name: "Housekeeping Test", slug: `housekeeping-${randomUUID()}` } });
    estateId = estate.id;

    const user = await prisma.user.create({ data: { name: "Operator", email: `housekeeping-${randomUUID()}@example.com` } });
    userId = user.id;

    const property = await createProperty(estateId, userId, {
      name: "Housekeeping Test Property",
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

    const guest = await createGuest(estateId, userId, { fullName: "Test Guest", phone: "+2348011112222" });
    guestId = guest.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("has no open housekeeping task before checkout", async () => {
    expect(await hasOpenHousekeepingTask(estateId, unitId)).toBe(false);
  });

  it("checking a reservation out creates a PENDING housekeeping task for that unit", async () => {
    const reservation = await createReservation(estateId, userId, {
      unitId,
      guestId,
      checkInDate: new Date("2027-05-01"),
      checkOutDate: new Date("2027-05-03"),
      numberOfGuests: 1,
      nightlyRateMinor: 5000000,
      taxesMinor: 0,
      cleaningFeeMinor: 0,
      securityDepositMinor: 0,
      discountMinor: 0,
      additionalFeesMinor: 0,
      bookingSource: "DIRECT",
    });

    await updateReservationStatus(estateId, userId, reservation.id, "CONFIRMED");
    await updateReservationStatus(estateId, userId, reservation.id, "CHECKED_IN");
    await updateReservationStatus(estateId, userId, reservation.id, "CHECKED_OUT");

    expect(await hasOpenHousekeepingTask(estateId, unitId)).toBe(true);

    const tasks = await listHousekeepingTasks(estateId, { status: "PENDING" });
    const task = tasks.find((t) => t.unitId === unitId);
    expect(task).toBeDefined();
    expect(task!.status).toBe("PENDING");

    await updateHousekeepingTask(estateId, userId, task!.id, { status: "COMPLETED" });
    expect(await hasOpenHousekeepingTask(estateId, unitId)).toBe(false);
  });
});
