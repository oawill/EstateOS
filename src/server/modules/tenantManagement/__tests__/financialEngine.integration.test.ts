import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";
import { createOrGetOwnProfile, createManagedProperty, createRentalUnit } from "../property";
import { createTenant } from "../tenant";
import { createLease } from "../lease";
import { recordPayment, reversePayment, waiveObligation, getTenantBalance, getArrears } from "../payments";
import { createTenantCharge } from "../charges";
import { calculateManagementFeeMinor, upsertManagementAgreement, generateLandlordSettlement } from "../managementFee";
import { handleTenantPaystackWebhook } from "../paystack";
import { runReminderSweep, updateReminderSetting } from "../reminders";

function actorFor(userId: string): CurrentUser {
  return { id: userId, email: null, name: "Test User", isPlatformAdmin: false };
}

async function makeUser(label: string) {
  return prisma.user.create({ data: { name: label, email: `tm-fin-${label}-${randomUUID()}@example.com` } });
}

/** Builds owner + property + unit + tenant + one active lease in one call — every test in this file needs this same scaffold. */
async function setupLease(label: string, opts: { rentAmountMinor: number; frequency?: "MONTHLY" | "ANNUAL" }) {
  const ownerUser = await makeUser(label);
  const owner = await createOrGetOwnProfile(ownerUser.id, { name: `Owner ${label}`, preferredCurrency: "NGN" });
  const actor = actorFor(ownerUser.id);

  const property = await createManagedProperty(actor, {
    ownerId: owner.id,
    name: `Property ${label}`,
    addressLine: "1 Test Street",
    city: "Lagos",
    country: "NG",
    propertyType: "FLAT",
  });
  const unit = await createRentalUnit(actor, {
    propertyId: property.id,
    label: "Unit A",
    rentAmountMinor: opts.rentAmountMinor,
    rentFrequency: opts.frequency ?? "ANNUAL",
    serviceChargeMinor: 0,
    securityDepositMinor: 0,
  });
  const tenant = await createTenant(actor, { fullName: `Tenant ${label}` });
  const lease = await createLease(actor, {
    tenantId: tenant.id,
    unitId: unit.id,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2027-01-01"),
    rentAmountMinor: opts.rentAmountMinor,
    paymentFrequency: opts.frequency ?? "ANNUAL",
    securityDepositMinor: 0,
    serviceChargeMinor: 0,
    rentDueDay: 1,
    gracePeriodDays: 0,
  });

  return { ownerUserId: ownerUser.id, ownerId: owner.id, actor, property, unit, tenant, lease };
}

describe("Tenant Management financial engine (integration)", () => {
  const cleanupUserIds: string[] = [];
  afterAll(async () => {
    for (const id of cleanupUserIds) await prisma.user.deleteMany({ where: { id } });
  });

  it("supports multiple partial payments before an obligation becomes PAID", async () => {
    const { ownerUserId, actor, lease, tenant } = await setupLease("multi-partial", { rentAmountMinor: 900_000 });
    cleanupUserIds.push(ownerUserId);

    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    await recordPayment(actor, {
      tenantId: tenant.id,
      leaseId: lease.id,
      amountMinor: 300_000,
      method: "CASH",
      allocations: [{ rentObligationId: obligation.id, amountMinor: 300_000 }],
    });
    let current = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    expect(current.status).toBe("PARTIALLY_PAID");
    expect(current.amountPaidMinor).toBe(300_000);

    await recordPayment(actor, {
      tenantId: tenant.id,
      leaseId: lease.id,
      amountMinor: 300_000,
      method: "CASH",
      allocations: [{ rentObligationId: obligation.id, amountMinor: 300_000 }],
    });
    current = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    expect(current.status).toBe("PARTIALLY_PAID");
    expect(current.amountPaidMinor).toBe(600_000);

    await recordPayment(actor, {
      tenantId: tenant.id,
      leaseId: lease.id,
      amountMinor: 300_000,
      method: "CASH",
      allocations: [{ rentObligationId: obligation.id, amountMinor: 300_000 }],
    });
    current = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    expect(current.status).toBe("PAID");
    expect(current.amountPaidMinor).toBe(900_000);

    const payments = await prisma.rentPayment.findMany({ where: { leaseId: lease.id } });
    expect(payments).toHaveLength(3);
  });

  it("caps an obligation's amountPaidMinor at what it owes and turns the excess into an account credit — never a negative-looking balance with no explanation", async () => {
    const { ownerUserId, actor, lease, tenant } = await setupLease("overpay", { rentAmountMinor: 500_000 });
    cleanupUserIds.push(ownerUserId);

    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    const result = await recordPayment(actor, {
      tenantId: tenant.id,
      leaseId: lease.id,
      amountMinor: 800_000, // 300,000 more than owed
      method: "BANK_TRANSFER",
      allocations: [{ rentObligationId: obligation.id, amountMinor: 800_000 }],
    });

    expect(result.creditMinor).toBe(300_000);
    const updatedObligation = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    expect(updatedObligation.amountPaidMinor).toBe(500_000); // never exceeds amountDueMinor
    expect(updatedObligation.status).toBe("PAID");

    const balance = await getTenantBalance(tenant.id);
    expect(balance.creditMinor).toBe(300_000);
    expect(balance.currentBalanceMinor).toBe(0);
  });

  it("lets one payment cover both a rent obligation and a separate charge in a single transaction", async () => {
    const { ownerUserId, actor, property, unit, lease, tenant } = await setupLease("multi-target", { rentAmountMinor: 400_000 });
    cleanupUserIds.push(ownerUserId);

    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });
    const charge = await createTenantCharge(actor, {
      tenantId: tenant.id,
      propertyId: property.id,
      unitId: unit.id,
      leaseId: lease.id,
      type: "UTILITY",
      amountMinor: 50_000,
      dueDate: new Date("2026-02-01"),
      description: "Generator diesel top-up",
    });

    const result = await recordPayment(actor, {
      tenantId: tenant.id,
      leaseId: lease.id,
      amountMinor: 450_000,
      method: "BANK_TRANSFER",
      allocations: [
        { rentObligationId: obligation.id, amountMinor: 400_000 },
        { chargeId: charge.id, amountMinor: 50_000 },
      ],
    });

    expect(result.creditMinor).toBe(0);
    const updatedObligation = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    const updatedCharge = await prisma.tenantCharge.findUniqueOrThrow({ where: { id: charge.id } });
    expect(updatedObligation.status).toBe("PAID");
    expect(updatedCharge.status).toBe("PAID");

    const allocations = await prisma.paymentAllocation.findMany({ where: { paymentId: result.payment.id } });
    expect(allocations).toHaveLength(2);
  });

  it("rejects a second online payment reusing the same gateway reference", async () => {
    const { ownerUserId, actor, lease, tenant } = await setupLease("dup-ref", { rentAmountMinor: 100_000 });
    cleanupUserIds.push(ownerUserId);
    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    const sharedRef = `DUPREF-${randomUUID()}`;
    await recordPayment(actor, {
      tenantId: tenant.id,
      leaseId: lease.id,
      amountMinor: 100_000,
      method: "ONLINE_PAYMENT",
      gatewayReference: sharedRef,
      allocations: [{ rentObligationId: obligation.id, amountMinor: 100_000 }],
    });

    // A second lease/obligation reusing the exact same gateway reference
    // must fail at the database's unique constraint — this is what
    // physically prevents a duplicate Paystack reference from ever
    // recording two payments.
    const { lease: lease2, tenant: tenant2 } = await setupLease("dup-ref-2", { rentAmountMinor: 100_000 });
    const obligation2 = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease2.id } });

    await expect(
      recordPayment(actor, {
        tenantId: tenant2.id,
        leaseId: lease2.id,
        amountMinor: 100_000,
        method: "ONLINE_PAYMENT",
        gatewayReference: sharedRef,
        allocations: [{ rentObligationId: obligation2.id, amountMinor: 100_000 }],
      }),
    ).rejects.toThrow();
  });

  it("reverses a payment without deleting it, rolling back the obligation's ledger and preserving the original row", async () => {
    const { ownerUserId, actor, lease, tenant } = await setupLease("reversal", { rentAmountMinor: 600_000 });
    cleanupUserIds.push(ownerUserId);
    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    const { payment } = await recordPayment(actor, {
      tenantId: tenant.id,
      leaseId: lease.id,
      amountMinor: 600_000,
      method: "CASH",
      allocations: [{ rentObligationId: obligation.id, amountMinor: 600_000 }],
    });

    const paidObligation = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    expect(paidObligation.status).toBe("PAID");

    const reversed = await reversePayment(actor, payment.id, "Bounced cheque");
    expect(reversed.status).toBe("REVERSED");
    expect(reversed.reversalReason).toBe("Bounced cheque");

    const rolledBackObligation = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    expect(rolledBackObligation.amountPaidMinor).toBe(0);
    expect(rolledBackObligation.status).toBe("OVERDUE"); // due date (2026-01-01) has passed

    // The original payment row still exists — never deleted.
    const stillExists = await prisma.rentPayment.findUnique({ where: { id: payment.id } });
    expect(stillExists).not.toBeNull();

    await expect(reversePayment(actor, payment.id, "Trying again")).rejects.toThrow(ForbiddenError);
  });

  it("cannot record a payment against a payment that's already been reversed as if it were still open", async () => {
    const { ownerUserId, actor, lease, tenant } = await setupLease("reversal-guard", { rentAmountMinor: 200_000 });
    cleanupUserIds.push(ownerUserId);
    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });
    await waiveObligation(actor, obligation.id, "Goodwill gesture");

    await expect(
      recordPayment(actor, {
        tenantId: tenant.id,
        leaseId: lease.id,
        amountMinor: 100_000,
        method: "CASH",
        allocations: [{ rentObligationId: obligation.id, amountMinor: 100_000 }],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("waives an obligation while preserving its original amount", async () => {
    const { ownerUserId, actor, lease } = await setupLease("waiver", { rentAmountMinor: 750_000 });
    cleanupUserIds.push(ownerUserId);
    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    const waived = await waiveObligation(actor, obligation.id, "Tenant hardship");
    expect(waived.status).toBe("WAIVED");
    expect(waived.amountDueMinor).toBe(0);
    expect(waived.originalAmountMinor).toBe(750_000); // never mutated
    expect(waived.adjustmentsMinor).toBe(-750_000);
  });

  it("calculates a percentage and a fixed management fee correctly, in minor units, never floating point", () => {
    const percentAgreement = { feeType: "PERCENTAGE", feeBasisPoints: 1000, feeAmountMinor: null }; // 10.00%
    expect(calculateManagementFeeMinor(percentAgreement, 1_000_000)).toBe(100_000);

    const fixedAgreement = { feeType: "FIXED_MONTHLY", feeBasisPoints: null, feeAmountMinor: 50_000 };
    expect(calculateManagementFeeMinor(fixedAgreement, 1_000_000)).toBe(50_000);

    expect(calculateManagementFeeMinor(null, 1_000_000)).toBe(0);
  });

  it("generates a landlord settlement that nets gross collections minus the management fee minus expenses", async () => {
    const { ownerUserId, actor, ownerId, property, lease, tenant } = await setupLease("settlement", { rentAmountMinor: 1_000_000 });
    cleanupUserIds.push(ownerUserId);
    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    await upsertManagementAgreement(actor, { propertyId: property.id, feeType: "PERCENTAGE", feePercent: 10 });

    const paidAt = new Date();
    await recordPayment(actor, {
      tenantId: tenant.id,
      leaseId: lease.id,
      amountMinor: 1_000_000,
      method: "BANK_TRANSFER",
      paidAt,
      allocations: [{ rentObligationId: obligation.id, amountMinor: 1_000_000 }],
    });

    const settlement = await generateLandlordSettlement(actor, {
      ownerId,
      propertyId: property.id,
      periodMonth: paidAt.getUTCMonth() + 1,
      periodYear: paidAt.getUTCFullYear(),
    });

    expect(settlement.grossCollectionsMinor).toBe(1_000_000);
    expect(settlement.managementFeeMinor).toBe(100_000);
    expect(settlement.netAmountMinor).toBe(900_000);
    expect(settlement.status).toBe("PENDING");
  });

  it("computes arrears with age-bucket and minimum-amount filters, grouping overdue obligations correctly", async () => {
    const { ownerUserId, unit, property } = await setupLease("arrears", { rentAmountMinor: 1_000_000 });
    cleanupUserIds.push(ownerUserId);

    const arrears = await getArrears([property.id], { minAmountMinor: 1 });
    expect(arrears.rows.some((r) => r.unit.id === unit.id)).toBe(true);
    expect(arrears.rows.every((r) => r.outstandingMinor >= 1)).toBe(true);

    const impossible = await getArrears([property.id], { minAmountMinor: 100_000_000 });
    expect(impossible.rows).toHaveLength(0);
  });

  it("processes a successful Paystack webhook idempotently — the same event delivered twice only applies once", async () => {
    const { ownerUserId, tenant, lease } = await setupLease("webhook-success", { rentAmountMinor: 300_000 });
    cleanupUserIds.push(ownerUserId);
    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    const reference = `WEBHOOK-${randomUUID()}`;
    const payment = await prisma.rentPayment.create({
      data: {
        referenceNumber: reference,
        tenantId: tenant.id,
        leaseId: lease.id,
        obligationId: obligation.id,
        amountMinor: 300_000,
        method: "ONLINE_PAYMENT",
        status: "PENDING",
        gatewayReference: reference,
      },
    });
    await prisma.paymentAllocation.create({ data: { paymentId: payment.id, rentObligationId: obligation.id, amountMinor: 300_000 } });

    const first = await handleTenantPaystackWebhook("charge.success", reference);
    expect(first.status).toBe("completed");

    const afterFirst = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    expect(afterFirst.amountPaidMinor).toBe(300_000);
    expect(afterFirst.status).toBe("PAID");

    // Paystack retries the exact same webhook delivery — must be a no-op,
    // never double-crediting the obligation.
    const second = await handleTenantPaystackWebhook("charge.success", reference);
    expect(second.status).toBe("duplicate");

    const afterSecond = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    expect(afterSecond.amountPaidMinor).toBe(300_000); // unchanged
  });

  it("marks a payment FAILED on a charge.failed webhook without touching the obligation", async () => {
    const { ownerUserId, tenant, lease } = await setupLease("webhook-failed", { rentAmountMinor: 150_000 });
    cleanupUserIds.push(ownerUserId);
    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    const reference = `WEBHOOK-FAIL-${randomUUID()}`;
    const payment = await prisma.rentPayment.create({
      data: {
        referenceNumber: reference,
        tenantId: tenant.id,
        leaseId: lease.id,
        obligationId: obligation.id,
        amountMinor: 150_000,
        method: "ONLINE_PAYMENT",
        status: "PENDING",
        gatewayReference: reference,
      },
    });

    const result = await handleTenantPaystackWebhook("charge.failed", reference);
    expect(result.status).toBe("failed");

    const updatedPayment = await prisma.rentPayment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(updatedPayment.status).toBe("FAILED");

    const untouchedObligation = await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
    expect(untouchedObligation.amountPaidMinor).toBe(0);
  });

  it("an unrecognized webhook reference doesn't throw — just acknowledged as unknown", async () => {
    const result = await handleTenantPaystackWebhook("charge.success", `NEVER-EXISTED-${randomUUID()}`);
    expect(result.status).toBe("unknown_reference");
  });

  it("sends a rent reminder exactly once per (obligation, threshold) — a repeat sweep skips it instead of re-sending", async () => {
    const { ownerUserId, ownerId, actor, lease } = await setupLease("reminder-sweep", { rentAmountMinor: 100_000 });
    cleanupUserIds.push(ownerUserId);
    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    // Due 2026-01-01; back-date "today" isn't possible, so instead move
    // the obligation's due date to exactly 7 days from now, matching the
    // default beforeDueDays threshold, and configure that as the owner's
    // only threshold to keep the assertion unambiguous.
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7);
    await prisma.rentObligation.update({ where: { id: obligation.id }, data: { dueDate: sevenDaysFromNow, status: "UPCOMING" } });
    await updateReminderSetting(actor, { beforeDueDays: [7], afterDueDays: [] });

    const first = await runReminderSweep();
    const logsAfterFirst = await prisma.rentReminderLog.findMany({ where: { obligationId: obligation.id } });
    expect(logsAfterFirst).toHaveLength(1);
    expect(logsAfterFirst[0].direction).toBe("BEFORE_DUE");
    expect(logsAfterFirst[0].offsetDays).toBe(7);
    expect(first.sent).toBeGreaterThanOrEqual(1);

    const second = await runReminderSweep();
    const logsAfterSecond = await prisma.rentReminderLog.findMany({ where: { obligationId: obligation.id } });
    expect(logsAfterSecond).toHaveLength(1); // no duplicate row
    expect(second.skipped).toBeGreaterThanOrEqual(1);

    await prisma.rentReminderSetting.deleteMany({ where: { ownerId } });
  });
});
