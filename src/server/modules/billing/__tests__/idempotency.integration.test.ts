import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { handlePaystackChargeSuccess } from "../service";

/**
 * Exercises the real database to prove the property that matters most for
 * payment processing: Paystack (or any webhook sender) can retry a
 * `charge.success` delivery — which it does, by design, until it gets a
 * 2xx — without ever double-crediting an invoice or issuing two receipts.
 */
describe("payment idempotency (integration)", () => {
  let estateId: string;
  let invoiceId: string;
  let paymentId: string;
  const reference = `TEST-${randomUUID()}`;

  beforeAll(async () => {
    const estate = await prisma.estate.create({
      data: { name: "Idempotency Test Estate", slug: `idempotency-test-${randomUUID()}` },
    });
    estateId = estate.id;

    const property = await prisma.property.create({
      data: {
        estateId,
        addressLabel: "Test House",
        propertyType: "DETACHED_HOUSE",
        units: { create: { estateId, label: "" } },
      },
      include: { units: true },
    });

    const resident = await prisma.resident.create({
      data: { estateId, firstName: "Test", lastName: "Resident", email: "test@example.com" },
    });

    await prisma.occupancy.create({
      data: { unitId: property.units[0].id, residentId: resident.id, role: "OWNER", moveInDate: new Date() },
    });

    const charge = await prisma.charge.create({
      data: {
        estateId,
        title: "Test Charge",
        chargeType: "OTHER",
        amountKobo: 500_000,
        dueDate: new Date(),
        targetType: "ENTIRE_ESTATE",
        targetCriteria: {},
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        estateId,
        chargeId: charge.id,
        unitId: property.units[0].id,
        residentId: resident.id,
        invoiceNumber: `TEST-INV-${randomUUID()}`,
        amountKobo: 500_000,
        dueDate: new Date(),
        status: "PENDING",
      },
    });
    invoiceId = invoice.id;

    const payment = await prisma.payment.create({
      data: {
        estateId,
        invoiceId: invoice.id,
        amountKobo: 500_000,
        method: "PAYSTACK_CARD",
        status: "PENDING",
        paystackReference: reference,
      },
    });
    paymentId = payment.id;
  });

  afterAll(async () => {
    await prisma.estate.delete({ where: { id: estateId } });
  });

  it("applying the same webhook event twice only credits the payment once", async () => {
    await handlePaystackChargeSuccess(reference);
    await handlePaystackChargeSuccess(reference);
    await handlePaystackChargeSuccess(reference);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    expect(payment.status).toBe("SUCCESSFUL");

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.status).toBe("PAID");

    const receipts = await prisma.receipt.findMany({ where: { paymentId } });
    expect(receipts).toHaveLength(1);

    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "Payment", entityId: paymentId, action: "payment.succeeded" },
    });
    expect(auditLogs).toHaveLength(1);
  });

  it("an unknown reference is acknowledged as a no-op, not an error", async () => {
    await expect(handlePaystackChargeSuccess(`unknown-${randomUUID()}`)).resolves.toBeUndefined();
  });
});
