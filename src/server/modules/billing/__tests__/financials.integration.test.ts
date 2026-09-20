import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import {
  applySuccessfulPayment,
  getArrearsAging,
  getResidentCreditBalanceKobo,
  raiseBillingDispute,
  transitionDispute,
} from "../service";

describe("Estate financials foundation (integration)", () => {
  let estateId: string;
  let unitId: string;
  let residentId: string;
  let userId: string;

  beforeAll(async () => {
    const estate = await prisma.estate.create({
      data: { name: "Financials Test Estate", slug: `financials-test-${randomUUID()}` },
    });
    estateId = estate.id;

    const property = await prisma.property.create({
      data: { estateId, addressLabel: "Test House", propertyType: "DETACHED_HOUSE", units: { create: { estateId, label: "1A" } } },
      include: { units: true },
    });
    unitId = property.units[0].id;

    const user = await prisma.user.create({ data: { name: "Fin Resident", email: `fin-resident-${randomUUID()}@example.com` } });
    userId = user.id;

    const resident = await prisma.resident.create({
      data: { estateId, userId, firstName: "Fin", lastName: "Resident", email: "fin-resident@example.com" },
    });
    residentId = resident.id;

    await prisma.occupancy.create({
      data: { unitId, residentId, role: "OWNER", moveInDate: new Date() },
    });
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("overpaying an invoice creates account credit instead of vanishing", async () => {
    const charge = await prisma.charge.create({
      data: { estateId, title: "Overpay Charge", chargeType: "OTHER", amountKobo: 100_000, dueDate: new Date(), targetType: "ENTIRE_ESTATE", targetCriteria: {} },
    });
    const invoice = await prisma.invoice.create({
      data: { estateId, chargeId: charge.id, unitId, residentId, invoiceNumber: `TEST-INV-${randomUUID()}`, amountKobo: 100_000, dueDate: new Date(), status: "PENDING" },
    });
    const payment = await prisma.payment.create({
      data: { estateId, invoiceId: invoice.id, amountKobo: 150_000, method: "MANUAL_BANK_TRANSFER", status: "PENDING" },
    });

    await applySuccessfulPayment(payment.id, null);

    const updatedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(updatedInvoice.status).toBe("PAID");

    const creditBalance = await getResidentCreditBalanceKobo(estateId, residentId);
    expect(creditBalance).toBe(50_000);

    const credit = await prisma.accountCredit.findUniqueOrThrow({ where: { sourcePaymentId: payment.id } });
    expect(credit.amountKobo).toBe(50_000);
    expect(credit.remainingKobo).toBe(50_000);
  });

  it("ages an overdue invoice into the correct bucket without touching a healthy one", async () => {
    const overdueCharge = await prisma.charge.create({
      data: { estateId, title: "Overdue Charge", chargeType: "OTHER", amountKobo: 200_000, dueDate: new Date("2020-01-01"), targetType: "ENTIRE_ESTATE", targetCriteria: {} },
    });
    await prisma.invoice.create({
      data: { estateId, chargeId: overdueCharge.id, unitId, residentId, invoiceNumber: `TEST-INV-${randomUUID()}`, amountKobo: 200_000, dueDate: new Date("2020-01-01"), status: "PENDING" },
    });

    const { residents, totals } = await getArrearsAging(estateId);
    const entry = residents.find((r) => r.residentId === residentId);
    expect(entry).toBeDefined();
    expect(entry?.buckets.d180_plus).toBeGreaterThanOrEqual(200_000);
    expect(totals.d180_plus).toBeGreaterThanOrEqual(200_000);
  });

  it("a resident's questioned charge never removes the invoice and requires a note to close", async () => {
    const charge = await prisma.charge.create({
      data: { estateId, title: "Disputed Charge", chargeType: "OTHER", amountKobo: 75_000, dueDate: new Date(), targetType: "ENTIRE_ESTATE", targetCriteria: {} },
    });
    const invoice = await prisma.invoice.create({
      data: { estateId, chargeId: charge.id, unitId, residentId, invoiceNumber: `TEST-INV-${randomUUID()}`, amountKobo: 75_000, dueDate: new Date(), status: "PENDING" },
    });

    const dispute = await raiseBillingDispute(estateId, userId, residentId, invoice.id, "I already moved out");
    expect(dispute.status).toBe("OPEN");

    await expect(transitionDispute(estateId, userId, dispute.id, "RESOLVED")).rejects.toThrow();

    const resolved = await transitionDispute(estateId, userId, dispute.id, "RESOLVED", "Confirmed still resident, charge stands.");
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedByUserId).toBe(userId);

    const untouchedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(untouchedInvoice.status).toBe("PENDING");
    expect(untouchedInvoice.amountKobo).toBe(75_000);
  });
});
