import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { createShortletMaintenanceTicket, createTicket, listShortletMaintenanceTickets, listTicketsForResident } from "../service";
import { createProperty } from "@/server/modules/shortlet/properties";
import { scoped } from "@/server/db/scoped";

describe("Shortlet maintenance ticket path (integration)", () => {
  let estateId: string;
  let userId: string;
  let residentId: string;
  let residentUserId: string;
  let unitId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({ data: { name: "Shortlet Maintenance Test", slug: `shortlet-maint-${randomUUID()}` } });
    estateId = estate.id;

    const user = await prisma.user.create({ data: { name: "Operator", email: `shortlet-maint-${randomUUID()}@example.com` } });
    userId = user.id;

    const residentUser = await prisma.user.create({ data: { name: "A Resident", email: `shortlet-maint-res-${randomUUID()}@example.com` } });
    residentUserId = residentUser.id;
    const resident = await prisma.resident.create({
      data: { estateId, userId: residentUser.id, firstName: "A", lastName: "Resident" },
    });
    residentId = resident.id;

    const property = await createProperty(estateId, userId, {
      name: "Maintenance Test Property",
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
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, residentUserId] } } });
  });

  it("creates a ticket with shortletUnitId set and residentId null", async () => {
    const ticket = await createShortletMaintenanceTicket(estateId, unitId, userId, {
      category: "PLUMBING",
      description: "Leaking tap in the bathroom",
      priority: "MEDIUM",
    });

    expect(ticket.residentId).toBeNull();
    expect(ticket.shortletUnitId).toBe(unitId);
  });

  it("a shortlet ticket never appears in a resident's own ticket list", async () => {
    await createShortletMaintenanceTicket(estateId, unitId, userId, {
      category: "ELECTRICITY",
      description: "Power socket not working",
      priority: "LOW",
    });

    const residentTickets = await listTicketsForResident(estateId, residentId);
    expect(residentTickets.every((t) => t.shortletUnitId === null)).toBe(true);
  });

  it("a residential ticket never appears in the shortlet maintenance list", async () => {
    await createTicket(estateId, residentId, residentUserId, {
      category: "WATER",
      description: "No water pressure in the residential unit",
      priority: "LOW",
    });

    const shortletTickets = await listShortletMaintenanceTickets(estateId);
    expect(shortletTickets.every((t) => t.residentId === null)).toBe(true);
    expect(shortletTickets.every((t) => t.shortletUnitId !== null)).toBe(true);
  });
});
