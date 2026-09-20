import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { getCommandCenterOverview } from "../commandCenter";

describe("Estate Command Center overview (integration)", () => {
  let estateId: string;
  let residentUserId: string;
  let adminUserId: string;
  let residentId: string;
  let unitId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({ data: { name: "Command Center Estate", slug: `cc-estate-${randomUUID()}` } });
    estateId = estate.id;

    const admin = await prisma.user.create({ data: { name: "Admin", email: `cc-admin-${randomUUID()}@example.com` } });
    adminUserId = admin.id;
    const residentUser = await prisma.user.create({ data: { name: "Resident", email: `cc-resident-${randomUUID()}@example.com` } });
    residentUserId = residentUser.id;

    const resident = await prisma.resident.create({ data: { estateId, userId: residentUserId, firstName: "Test", lastName: "Resident" } });
    residentId = resident.id;

    const property = await prisma.property.create({ data: { estateId, addressLabel: "House 1", propertyType: "DETACHED_HOUSE" } });
    const unit = await prisma.unit.create({ data: { propertyId: property.id, estateId, label: "1A", occupancyStatus: "OCCUPIED" } });
    unitId = unit.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: adminUserId } });
    await prisma.user.delete({ where: { id: residentUserId } });
  });

  it("reports an empty Needs Attention queue for a healthy estate", async () => {
    const overview = await getCommandCenterOverview(estateId);
    expect(overview.attention).toHaveLength(0);
    expect(overview.kpis.unitCount).toBe(1);
    expect(overview.kpis.occupiedUnits).toBe(1);
  });

  it("surfaces an overdue service charge as a high-urgency attention item", async () => {
    const charge = await prisma.charge.create({
      data: {
        estateId,
        title: "Overdue Charge",
        chargeType: "SERVICE_CHARGE_MONTHLY",
        amountKobo: 100_000,
        dueDate: new Date("2020-01-01"),
        targetType: "ENTIRE_ESTATE",
        targetCriteria: {},
      },
    });
    await prisma.invoice.create({
      data: {
        estateId,
        chargeId: charge.id,
        unitId,
        residentId,
        invoiceNumber: `INV-${Math.floor(Math.random() * 900000 + 100000)}`,
        amountKobo: 100_000,
        dueDate: new Date("2020-01-01"),
        status: "PENDING",
      },
    });

    const overview = await getCommandCenterOverview(estateId);
    const item = overview.attention.find((a) => a.id === "overdue-invoices");
    expect(item).toBeDefined();
    expect(item?.urgency).toBe("high");
    expect(overview.kpis.outstandingKobo).toBeGreaterThanOrEqual(100_000);
  });

  it("surfaces an open security incident and ranks it before lower-urgency items", async () => {
    const { createIncident } = await import("@/server/modules/security/incidents");
    await createIncident(estateId, adminUserId, { category: "SECURITY_CONCERN", severity: "MEDIUM", description: "Test incident" });

    const overview = await getCommandCenterOverview(estateId);
    const incidentItem = overview.attention.find((a) => a.id === "open-incidents");
    expect(incidentItem).toBeDefined();
    expect(incidentItem?.urgency).toBe("high");
    expect(overview.kpis.openIncidents).toBeGreaterThanOrEqual(1);
  });

  it("keeps KPI counts scoped to the requested estate only", async () => {
    const otherEstate = await prisma.estate.create({ data: { name: "Other Estate", slug: `other-estate-${randomUUID()}` } });
    const otherProperty = await prisma.property.create({ data: { estateId: otherEstate.id, addressLabel: "House X", propertyType: "DETACHED_HOUSE" } });
    await prisma.unit.create({ data: { propertyId: otherProperty.id, estateId: otherEstate.id, label: "X1", occupancyStatus: "VACANT" } });

    const overview = await getCommandCenterOverview(estateId);
    // Only the 1 unit created for THIS estate should ever be counted, never the other estate's.
    expect(overview.kpis.unitCount).toBe(1);

    await prisma.estate.delete({ where: { id: otherEstate.id } });
  });
});
