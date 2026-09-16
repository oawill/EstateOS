import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";
import { createOrGetOwnProfile, createManagedProperty, createRentalUnit, assignPropertyManager } from "../property";
import { createTenant } from "../tenant";
import { createLease, renewLease } from "../lease";
import { recordRentPayment } from "../payments";
import { getAuthorizedPropertyIds } from "../access";

function actorFor(userId: string): CurrentUser {
  return { id: userId, email: null, name: "Test User", isPlatformAdmin: false };
}

async function makeUser(label: string) {
  return prisma.user.create({ data: { name: label, email: `tm-${label}-${randomUUID()}@example.com` } });
}

describe("Tenant Management (integration)", () => {
  const cleanupUserIds: string[] = [];

  afterAll(async () => {
    for (const id of cleanupUserIds) {
      await prisma.user.deleteMany({ where: { id } });
    }
  });

  it("generates one rent obligation per payment period, following the lease's own frequency", async () => {
    const ownerUser = await makeUser("owner-annual");
    cleanupUserIds.push(ownerUser.id);
    const owner = await createOrGetOwnProfile(ownerUser.id, { name: "Owner", preferredCurrency: "NGN" });
    const actor = actorFor(ownerUser.id);

    const property = await createManagedProperty(actor, {
      ownerId: owner.id,
      name: "Test Property",
      addressLine: "1 Test Street",
      city: "Lagos",
      country: "NG",
      propertyType: "FLAT",
    });
    const unit = await createRentalUnit(actor, {
      propertyId: property.id,
      label: "Unit A",
      rentAmountMinor: 1_200_000,
      rentFrequency: "MONTHLY",
      serviceChargeMinor: 0,
      securityDepositMinor: 0,
    });
    const tenant = await createTenant(actor, { fullName: "Annual Tenant" });

    const lease = await createLease(actor, {
      tenantId: tenant.id,
      unitId: unit.id,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
      rentAmountMinor: 100_000,
      paymentFrequency: "MONTHLY",
      securityDepositMinor: 0,
      serviceChargeMinor: 0,
      rentDueDay: 1,
      gracePeriodDays: 0,
    });

    const obligations = await prisma.rentObligation.findMany({ where: { leaseId: lease.id } });
    expect(obligations).toHaveLength(12);
    expect(obligations.every((o) => o.amountDueMinor === 100_000)).toBe(true);

    const updatedUnit = await prisma.rentalUnit.findUniqueOrThrow({ where: { id: unit.id } });
    expect(updatedUnit.status).toBe("OCCUPIED");
  });

  it("supports partial payments — an obligation only becomes PAID once the full amount is received", async () => {
    const ownerUser = await makeUser("owner-partial");
    cleanupUserIds.push(ownerUser.id);
    const owner = await createOrGetOwnProfile(ownerUser.id, { name: "Owner", preferredCurrency: "NGN" });
    const actor = actorFor(ownerUser.id);

    const property = await createManagedProperty(actor, {
      ownerId: owner.id,
      name: "Partial Payment Property",
      addressLine: "2 Test Street",
      city: "Lagos",
      country: "NG",
      propertyType: "FLAT",
    });
    const unit = await createRentalUnit(actor, {
      propertyId: property.id,
      label: "Unit B",
      rentAmountMinor: 500_000,
      rentFrequency: "ANNUAL",
      serviceChargeMinor: 0,
      securityDepositMinor: 0,
    });
    const tenant = await createTenant(actor, { fullName: "Partial Tenant" });
    const lease = await createLease(actor, {
      tenantId: tenant.id,
      unitId: unit.id,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
      rentAmountMinor: 500_000,
      paymentFrequency: "ANNUAL",
      securityDepositMinor: 0,
      serviceChargeMinor: 0,
      rentDueDay: 1,
      gracePeriodDays: 0,
    });

    const obligation = await prisma.rentObligation.findFirstOrThrow({ where: { leaseId: lease.id } });

    const { obligation: afterFirst } = await recordRentPayment(actor, {
      obligationId: obligation.id,
      amountMinor: 200_000,
      method: "BANK_TRANSFER",
    });
    expect(afterFirst.status).toBe("PARTIALLY_PAID");
    expect(afterFirst.amountDueMinor - afterFirst.amountPaidMinor).toBe(300_000);

    const { obligation: afterSecond } = await recordRentPayment(actor, {
      obligationId: obligation.id,
      amountMinor: 300_000,
      method: "CASH",
    });
    expect(afterSecond.status).toBe("PAID");
    expect(afterSecond.amountPaidMinor).toBe(500_000);

    const payments = await prisma.rentPayment.findMany({ where: { obligationId: obligation.id } });
    expect(payments).toHaveLength(2);
  });

  it("renews a lease into a brand-new row and never mutates the previous lease's own terms", async () => {
    const ownerUser = await makeUser("owner-renew");
    cleanupUserIds.push(ownerUser.id);
    const owner = await createOrGetOwnProfile(ownerUser.id, { name: "Owner", preferredCurrency: "NGN" });
    const actor = actorFor(ownerUser.id);

    const property = await createManagedProperty(actor, {
      ownerId: owner.id,
      name: "Renewal Property",
      addressLine: "3 Test Street",
      city: "Lagos",
      country: "NG",
      propertyType: "FLAT",
    });
    const unit = await createRentalUnit(actor, {
      propertyId: property.id,
      label: "Unit C",
      rentAmountMinor: 400_000,
      rentFrequency: "ANNUAL",
      serviceChargeMinor: 0,
      securityDepositMinor: 0,
    });
    const tenant = await createTenant(actor, { fullName: "Renewing Tenant" });
    const originalLease = await createLease(actor, {
      tenantId: tenant.id,
      unitId: unit.id,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2026-01-01"),
      rentAmountMinor: 400_000,
      paymentFrequency: "ANNUAL",
      securityDepositMinor: 0,
      serviceChargeMinor: 0,
      rentDueDay: 1,
      gracePeriodDays: 0,
    });

    const renewed = await renewLease(actor, {
      previousLeaseId: originalLease.id,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-01-01"),
      rentAmountMinor: 450_000,
      paymentFrequency: "ANNUAL",
      securityDepositMinor: 0,
      serviceChargeMinor: 0,
      rentDueDay: 1,
      gracePeriodDays: 0,
    });

    expect(renewed.id).not.toBe(originalLease.id);
    expect(renewed.rentAmountMinor).toBe(450_000);

    const untouchedOriginal = await prisma.lease.findUniqueOrThrow({ where: { id: originalLease.id } });
    expect(untouchedOriginal.rentAmountMinor).toBe(400_000); // never overwritten
    expect(untouchedOriginal.status).toBe("EXPIRED");

    const renewalRecord = await prisma.leaseRenewal.findFirstOrThrow({ where: { newLeaseId: renewed.id } });
    expect(renewalRecord.previousLeaseId).toBe(originalLease.id);

    const allLeasesForTenant = await prisma.lease.findMany({ where: { tenantId: tenant.id } });
    expect(allLeasesForTenant).toHaveLength(2); // history preserved, nothing deleted
  });

  it("prevents a landlord from acting on another landlord's property (IDOR)", async () => {
    const ownerAUser = await makeUser("owner-a");
    const ownerBUser = await makeUser("owner-b");
    cleanupUserIds.push(ownerAUser.id, ownerBUser.id);

    const ownerA = await createOrGetOwnProfile(ownerAUser.id, { name: "Owner A", preferredCurrency: "NGN" });
    await createOrGetOwnProfile(ownerBUser.id, { name: "Owner B", preferredCurrency: "NGN" });

    const actorA = actorFor(ownerAUser.id);
    const actorB = actorFor(ownerBUser.id);

    const propertyA = await createManagedProperty(actorA, {
      ownerId: ownerA.id,
      name: "Owner A's Property",
      addressLine: "4 Test Street",
      city: "Lagos",
      country: "NG",
      propertyType: "FLAT",
    });

    // Owner B tries to add a unit to Owner A's property by guessing its id.
    await expect(
      createRentalUnit(actorB, {
        propertyId: propertyA.id,
        label: "Sneaky Unit",
        rentAmountMinor: 100_000,
        rentFrequency: "ANNUAL",
        serviceChargeMinor: 0,
        securityDepositMinor: 0,
      }),
    ).rejects.toThrow(NotFoundError);

    const authorizedForB = await getAuthorizedPropertyIds(actorB);
    expect(authorizedForB).not.toContain(propertyA.id);
  });

  it("scopes a property manager to only the properties they are explicitly assigned", async () => {
    const ownerUser = await makeUser("owner-mgr");
    const managerUser = await makeUser("manager");
    cleanupUserIds.push(ownerUser.id, managerUser.id);

    const owner = await createOrGetOwnProfile(ownerUser.id, { name: "Owner", preferredCurrency: "NGN" });
    const ownerActor = actorFor(ownerUser.id);
    const managerActor = actorFor(managerUser.id);

    const managedProperty = await createManagedProperty(ownerActor, {
      ownerId: owner.id,
      name: "Assigned Property",
      addressLine: "5 Test Street",
      city: "Lagos",
      country: "NG",
      propertyType: "FLAT",
    });
    const unassignedProperty = await createManagedProperty(ownerActor, {
      ownerId: owner.id,
      name: "Unassigned Property",
      addressLine: "6 Test Street",
      city: "Lagos",
      country: "NG",
      propertyType: "FLAT",
    });

    // Before assignment, the manager has no access at all.
    expect(await getAuthorizedPropertyIds(managerActor)).toEqual([]);

    await assignPropertyManager(ownerActor, managedProperty.id, managerUser.email!);

    const authorizedForManager = await getAuthorizedPropertyIds(managerActor);
    expect(authorizedForManager).toContain(managedProperty.id);
    expect(authorizedForManager).not.toContain(unassignedProperty.id);

    // The manager can now act on the assigned property...
    await expect(
      createRentalUnit(managerActor, {
        propertyId: managedProperty.id,
        label: "Manager-created Unit",
        rentAmountMinor: 100_000,
        rentFrequency: "ANNUAL",
        serviceChargeMinor: 0,
        securityDepositMinor: 0,
      }),
    ).resolves.toBeDefined();

    // ...but never the unassigned one, even from the same owner.
    await expect(
      createRentalUnit(managerActor, {
        propertyId: unassignedProperty.id,
        label: "Should Fail",
        rentAmountMinor: 100_000,
        rentFrequency: "ANNUAL",
        serviceChargeMinor: 0,
        securityDepositMinor: 0,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
