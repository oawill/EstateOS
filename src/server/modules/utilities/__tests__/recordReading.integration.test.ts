import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { listInvoicesForResident } from "@/server/modules/billing/service";
import { createMeter, recordReading } from "../service";

describe("recordReading (integration)", () => {
  let estateId: string;
  let residentUserId: string;
  let residentId: string;
  let occupiedUnitId: string;
  let vacantUnitId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({
      data: { name: "Utilities Test Estate", slug: `utilities-test-${randomUUID()}` },
    });
    estateId = estate.id;

    const residentUser = await prisma.user.create({
      data: { name: "Test Resident", email: `resident-${randomUUID()}@example.com` },
    });
    residentUserId = residentUser.id;

    const property = await prisma.property.create({
      data: {
        estateId,
        addressLabel: "Utilities Test House",
        propertyType: "DETACHED_HOUSE",
        units: { create: [{ estateId, label: "Occupied" }, { estateId, label: "Vacant" }] },
      },
      include: { units: true },
    });
    occupiedUnitId = property.units.find((u) => u.label === "Occupied")!.id;
    vacantUnitId = property.units.find((u) => u.label === "Vacant")!.id;

    const resident = await prisma.resident.create({
      data: { estateId, userId: residentUser.id, firstName: "Test", lastName: "Resident" },
    });
    residentId = resident.id;

    await prisma.occupancy.create({
      data: { unitId: occupiedUnitId, residentId: resident.id, role: "OWNER", moveInDate: new Date() },
    });
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: residentUserId } });
  });

  it("a first reading establishes a baseline with no bill", async () => {
    const meter = await createMeter(estateId, residentUserId, {
      unitId: occupiedUnitId,
      utilityType: "ELECTRICITY",
      meterNumber: "MTR-001",
      rateKobo: 20_000,
    });

    const result = await recordReading(estateId, residentUserId, {
      meterId: meter.id,
      currentReading: 500,
      readingDate: new Date(),
    });

    expect(result.reading.previousReading).toBeNull();
    expect(result.bill).toBeNull();
  });

  it("a second reading generates a Charge + Invoice + UtilityBill with the correct amount", async () => {
    const meter = await createMeter(estateId, residentUserId, {
      unitId: occupiedUnitId,
      utilityType: "WATER",
      meterNumber: "MTR-002",
      rateKobo: 15_000,
    });

    await recordReading(estateId, residentUserId, { meterId: meter.id, currentReading: 100, readingDate: new Date() });
    const second = await recordReading(estateId, residentUserId, {
      meterId: meter.id,
      currentReading: 140,
      readingDate: new Date(),
    });

    expect(second.reading.previousReading).toBe(100);
    expect(second.bill).not.toBeNull();
    expect(second.bill!.consumption).toBe(40);
    expect(second.bill!.amountKobo).toBe(40 * 15_000);

    // The bill is a real, payable Invoice reachable through the existing billing service.
    const invoices = await listInvoicesForResident(estateId, residentId);
    const invoice = invoices.find((i) => i.id === second.bill!.invoiceId);
    expect(invoice).toBeDefined();
    expect(invoice!.amountKobo).toBe(40 * 15_000);
    expect(invoice!.status).toBe("PENDING");
  });

  it("rejects a reading lower than the previous one", async () => {
    const meter = await createMeter(estateId, residentUserId, {
      unitId: occupiedUnitId,
      utilityType: "ELECTRICITY",
      meterNumber: "MTR-003",
      rateKobo: 20_000,
    });

    await recordReading(estateId, residentUserId, { meterId: meter.id, currentReading: 200, readingDate: new Date() });

    await expect(
      recordReading(estateId, residentUserId, { meterId: meter.id, currentReading: 150, readingDate: new Date() }),
    ).rejects.toThrow("can't be lower");
  });

  it("records a reading on a vacant unit without generating a bill", async () => {
    const meter = await createMeter(estateId, residentUserId, {
      unitId: vacantUnitId,
      utilityType: "ELECTRICITY",
      meterNumber: "MTR-004",
      rateKobo: 20_000,
    });

    await recordReading(estateId, residentUserId, { meterId: meter.id, currentReading: 50, readingDate: new Date() });
    const second = await recordReading(estateId, residentUserId, {
      meterId: meter.id,
      currentReading: 80,
      readingDate: new Date(),
    });

    expect(second.bill).toBeNull();
  });
});
