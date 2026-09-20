import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";
import { createOrGetOwnProfile, createManagedProperty, createRentalUnit } from "../property";
import { createTenant } from "../tenant";
import { createLease } from "../lease";
import { recordRentPayment } from "../payments";
import { getPropertyFinancialSummary } from "../dashboard";

function actorFor(userId: string): CurrentUser {
  return { id: userId, email: null, name: "Test User", isPlatformAdmin: false };
}

async function makeUser(label: string) {
  return prisma.user.create({ data: { name: label, email: `owner-app-${label}-${randomUUID()}@example.com` } });
}

describe("Owner app — property-scoped financials (integration)", () => {
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    for (const id of cleanupUserIds) {
      await prisma.user.deleteMany({ where: { id } });
    }
  });

  it("scopes rent collected/outstanding to exactly one property, never bleeding in a sibling property's numbers", async () => {
    const ownerUser = await makeUser("owner-scoped");
    cleanupUserIds.push(ownerUser.id);
    const owner = await createOrGetOwnProfile(ownerUser.id, { name: "Owner", preferredCurrency: "NGN" });
    const actor = actorFor(ownerUser.id);

    const propertyA = await createManagedProperty(actor, {
      ownerId: owner.id,
      name: "Property A",
      addressLine: "1 Test Street",
      city: "Lagos",
      country: "NG",
      propertyType: "FLAT",
    });
    const propertyB = await createManagedProperty(actor, {
      ownerId: owner.id,
      name: "Property B",
      addressLine: "2 Test Street",
      city: "Lagos",
      country: "NG",
      propertyType: "FLAT",
    });

    const unitA = await createRentalUnit(actor, {
      propertyId: propertyA.id,
      label: "Unit A",
      rentAmountMinor: 500_000,
      rentFrequency: "MONTHLY",
      serviceChargeMinor: 0,
      securityDepositMinor: 0,
    });
    const unitB = await createRentalUnit(actor, {
      propertyId: propertyB.id,
      label: "Unit B",
      rentAmountMinor: 900_000,
      rentFrequency: "MONTHLY",
      serviceChargeMinor: 0,
      securityDepositMinor: 0,
    });

    const tenantA = await createTenant(actor, { fullName: "Tenant A" });
    const tenantB = await createTenant(actor, { fullName: "Tenant B" });

    const now = new Date();
    const leaseA = await createLease(actor, {
      tenantId: tenantA.id,
      unitId: unitA.id,
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear() + 1, now.getMonth(), 1),
      rentAmountMinor: 500_000,
      paymentFrequency: "MONTHLY",
      securityDepositMinor: 0,
      serviceChargeMinor: 0,
      rentDueDay: 1,
      gracePeriodDays: 0,
    });
    await createLease(actor, {
      tenantId: tenantB.id,
      unitId: unitB.id,
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear() + 1, now.getMonth(), 1),
      rentAmountMinor: 900_000,
      paymentFrequency: "MONTHLY",
      securityDepositMinor: 0,
      serviceChargeMinor: 0,
      rentDueDay: 1,
      gracePeriodDays: 0,
    });

    const obligationA = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: leaseA.id } });
    await recordRentPayment(actor, {
      obligationId: obligationA.id,
      amountMinor: 500_000,
      method: "BANK_TRANSFER",
      paidAt: new Date(),
    });

    const summaryA = await getPropertyFinancialSummary(actor, propertyA.id);
    const summaryB = await getPropertyFinancialSummary(actor, propertyB.id);

    // Property A's tenant paid in full — Property B's unpaid rent must never show up here.
    expect(summaryA.rentCollectedMinor).toBe(500_000);
    expect(summaryB.rentCollectedMinor).toBe(0);
    expect(summaryB.outstandingMinor).toBeGreaterThanOrEqual(900_000);
  });

  it("refuses to summarize a property that belongs to a different owner (cross-owner IDOR)", async () => {
    const ownerAUser = await makeUser("owner-a-idor");
    const ownerBUser = await makeUser("owner-b-idor");
    cleanupUserIds.push(ownerAUser.id, ownerBUser.id);

    const ownerA = await createOrGetOwnProfile(ownerAUser.id, { name: "Owner A", preferredCurrency: "NGN" });
    await createOrGetOwnProfile(ownerBUser.id, { name: "Owner B", preferredCurrency: "NGN" });

    const property = await createManagedProperty(actorFor(ownerAUser.id), {
      ownerId: ownerA.id,
      name: "Owner A's Property",
      addressLine: "1 Test Street",
      city: "Lagos",
      country: "NG",
      propertyType: "FLAT",
    });

    await expect(getPropertyFinancialSummary(actorFor(ownerBUser.id), property.id)).rejects.toThrow(
      expect.any(Error),
    );
    // Specifically a permission failure, not a generic crash.
    await expect(getPropertyFinancialSummary(actorFor(ownerBUser.id), property.id)).rejects.toSatisfy(
      (err: unknown) => err instanceof ForbiddenError || err instanceof NotFoundError,
    );
  });
});
