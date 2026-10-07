import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { zonedToUtc } from "@/lib/zonedTime";
import { bookAmenity, cancelBooking, createAmenity, listAmenities, listBookingsForResident, listUpcomingBookings } from "../service";

function futureDate(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

describe("Amenity booking (integration)", () => {
  let estateId: string;
  let otherEstateId: string;
  let userId: string;
  let amenityId: string;
  let residentA: string;
  let residentB: string;

  beforeAll(async () => {
    userId = (await prisma.user.create({ data: { name: "Admin", email: `amenity-${randomUUID()}@example.com` } })).id;
    estateId = (await prisma.estate.create({ data: { name: "Amenity Estate", slug: `amenity-${randomUUID()}`, timezone: "Africa/Lagos" } })).id;
    otherEstateId = (await prisma.estate.create({ data: { name: "Other Amenity Estate", slug: `amenity-other-${randomUUID()}` } })).id;
    residentA = (await prisma.resident.create({ data: { estateId, firstName: "A", lastName: "One" } })).id;
    residentB = (await prisma.resident.create({ data: { estateId, firstName: "B", lastName: "Two" } })).id;
    const amenity = await createAmenity(estateId, userId, {
      name: "Tennis Court",
      openTime: "08:00",
      closeTime: "20:00",
      slotMinutes: 60,
      maxSlots: 2,
      capacity: 1,
    });
    amenityId = amenity.id;
  });

  afterAll(async () => {
    await prisma.estate.deleteMany({ where: { id: { in: [estateId, otherEstateId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("books a valid slot in estate-local time and lists it for that resident only", async () => {
    const date = futureDate(3);
    const booking = await bookAmenity(estateId, residentA, { amenityId, date, startTime: "10:00", slots: 2 });

    expect(booking.startsAt.toISOString()).toBe(`${date}T09:00:00.000Z`); // 10:00 Lagos = 09:00 UTC
    expect(booking.endsAt.getTime() - booking.startsAt.getTime()).toBe(2 * 3_600_000);
    expect((await listBookingsForResident(estateId, residentA)).map((b) => b.id)).toContain(booking.id);
    expect(await listBookingsForResident(estateId, residentB)).toHaveLength(0);
    expect((await listUpcomingBookings(estateId)).map((b) => b.id)).toContain(booking.id);
  });

  it("rejects a booking that overlaps a full slot, but allows the next free one", async () => {
    const date = futureDate(3);
    await expect(bookAmenity(estateId, residentB, { amenityId, date, startTime: "11:00", slots: 1 })).rejects.toThrow(ForbiddenError);
    await expect(bookAmenity(estateId, residentB, { amenityId, date, startTime: "12:00", slots: 1 })).resolves.toBeTruthy();
  });

  it("lets exactly one of many simultaneous requests take the last place in a slot", async () => {
    const racers = await Promise.all(
      Array.from({ length: 8 }, (_, i) => prisma.resident.create({ data: { estateId, firstName: "Racer", lastName: String(i) } })),
    );
    const date = futureDate(6);
    const results = await Promise.allSettled(
      racers.map((r) => bookAmenity(estateId, r.id, { amenityId, date, startTime: "15:00", slots: 1 })),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const confirmed = await prisma.amenityBooking.count({ where: { amenityId, status: "CONFIRMED", startsAt: zonedToUtc(date, "15:00", "Africa/Lagos") } });
    expect(confirmed).toBe(1);
  });

  it("enforces opening hours, slot grid, max slots and the future-only window", async () => {
    const date = futureDate(4);
    await expect(bookAmenity(estateId, residentA, { amenityId, date, startTime: "07:00", slots: 1 })).rejects.toThrow(ForbiddenError);
    await expect(bookAmenity(estateId, residentA, { amenityId, date, startTime: "19:00", slots: 2 })).rejects.toThrow(ForbiddenError);
    await expect(bookAmenity(estateId, residentA, { amenityId, date, startTime: "10:30", slots: 1 })).rejects.toThrow(ForbiddenError);
    await expect(bookAmenity(estateId, residentA, { amenityId, date, startTime: "10:00", slots: 3 })).rejects.toThrow(ForbiddenError);
    await expect(bookAmenity(estateId, residentA, { amenityId, date: "2020-01-01", startTime: "10:00", slots: 1 })).rejects.toThrow(ForbiddenError);
    await expect(bookAmenity(estateId, residentA, { amenityId, date: futureDate(90), startTime: "10:00", slots: 1 })).rejects.toThrow(ForbiddenError);
  });

  it("never books an amenity from another estate, and only lets a resident cancel their own booking", async () => {
    await expect(bookAmenity(otherEstateId, residentA, { amenityId, date: futureDate(5), startTime: "10:00", slots: 1 })).rejects.toThrow(NotFoundError);

    const booking = await bookAmenity(estateId, residentA, { amenityId, date: futureDate(6), startTime: "09:00", slots: 1 });
    await expect(cancelBooking(estateId, residentB, booking.id)).rejects.toThrow(NotFoundError);
    const cancelled = await cancelBooking(estateId, residentA, booking.id);
    expect(cancelled.status).toBe("CANCELLED");

    // The freed slot can be taken again.
    await expect(bookAmenity(estateId, residentB, { amenityId, date: futureDate(6), startTime: "09:00", slots: 1 })).resolves.toBeTruthy();
  });

  it("hides inactive amenities from residents' list", async () => {
    await prisma.amenity.update({ where: { id: amenityId }, data: { isActive: false } });
    expect(await listAmenities(estateId)).toHaveLength(0);
    expect(await listAmenities(estateId, { includeInactive: true })).toHaveLength(1);
    await expect(bookAmenity(estateId, residentA, { amenityId, date: futureDate(7), startTime: "10:00", slots: 1 })).rejects.toThrow(NotFoundError);
    await prisma.amenity.update({ where: { id: amenityId }, data: { isActive: true } });
  });
});
