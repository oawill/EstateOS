import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { CurrentUser } from "@/server/auth/session";
import { createOrGetOwnProfile, createManagedProperty, createRentalUnit } from "../property";
import { createTenant } from "../tenant";
import { createMaintenanceRequestAsTenant, recordMaintenanceExpense } from "../maintenance";
import { decideExpense, listPendingApprovalsForOwner, respondToInfoRequest, setApprovalThreshold } from "../ownerApprovals";
import { assignPropertyManager } from "../property";

function actorFor(userId: string): CurrentUser {
  return { id: userId, email: null, name: "Test User", isPlatformAdmin: false };
}

async function makeUser(label: string, email?: string) {
  return prisma.user.create({ data: { name: label, email: email ?? `oa-${label}-${randomUUID()}@example.com` } });
}

async function setup(label: string) {
  const ownerUser = await makeUser(`owner-${label}`);
  const managerEmail = `oa-manager-${label}-${randomUUID()}@example.com`;
  const managerUser = await makeUser(`manager-${label}`, managerEmail);
  const owner = await createOrGetOwnProfile(ownerUser.id, { name: "Owner", preferredCurrency: "NGN" });
  const ownerActor = actorFor(ownerUser.id);
  const managerActor = actorFor(managerUser.id);

  const property = await createManagedProperty(ownerActor, {
    ownerId: owner.id,
    name: `Property ${label}`,
    addressLine: "1 Test Street",
    city: "Lagos",
    country: "NG",
    propertyType: "FLAT",
  });
  await assignPropertyManager(ownerActor, property.id, managerEmail);
  const unit = await createRentalUnit(ownerActor, { propertyId: property.id, label: "A1", rentAmountMinor: 100_000, rentFrequency: "MONTHLY", serviceChargeMinor: 0, securityDepositMinor: 0 });
  const tenant = await createTenant(ownerActor, { fullName: "Tenant" });
  const request = await createMaintenanceRequestAsTenant(tenant.id, { propertyId: property.id, unitId: unit.id, category: "PLUMBING", description: "Leak", priority: "MEDIUM", permissionToEnter: true, photoUrls: [] }).catch(async () => {
    // tenant isn't attached to the unit until a lease exists — create the request directly
    return prisma.maintenanceRequest.create({ data: { requestCode: `MR-${randomUUID()}`, propertyId: property.id, unitId: unit.id, category: "PLUMBING", description: "Leak", priority: "MEDIUM" } });
  });
  return { ownerUser, managerUser, ownerActor, managerActor, property, request };
}

describe("Owner approvals (integration)", () => {
  const cleanup: string[] = [];
  afterAll(async () => {
    await prisma.expenseApprovalComment.deleteMany({ where: { authorUserId: { in: cleanup } } });
    for (const id of cleanup) await prisma.user.deleteMany({ where: { id } });
  });

  it("only routes spend to the owner when it exceeds the threshold the owner set", async () => {
    const t = await setup("threshold");
    cleanup.push(t.ownerUser.id, t.managerUser.id);

    const noLimit = await recordMaintenanceExpense(t.managerActor, { requestId: t.request.id, vendorName: "V", description: "Big job", estimateMinor: 900_000, isPaid: false });
    expect(noLimit.approvalStatus).toBe("NOT_REQUIRED");

    await setApprovalThreshold(t.ownerActor, t.property.id, 100_000);
    const small = await recordMaintenanceExpense(t.managerActor, { requestId: t.request.id, vendorName: "V", description: "Small", estimateMinor: 50_000, isPaid: false });
    const large = await recordMaintenanceExpense(t.managerActor, { requestId: t.request.id, vendorName: "V", description: "AC replacement", estimateMinor: 275_000, isPaid: false });
    expect(small.approvalStatus).toBe("NOT_REQUIRED");
    expect(large.approvalStatus).toBe("PENDING");

    const ownerSpend = await recordMaintenanceExpense(t.ownerActor, { requestId: t.request.id, vendorName: "V", description: "Owner's own", estimateMinor: 500_000, isPaid: false });
    expect(ownerSpend.approvalStatus).toBe("NOT_REQUIRED");

    expect((await listPendingApprovalsForOwner(t.ownerActor)).map((e) => e.id)).toEqual([large.id]);
  });

  it("blocks marking over-limit spend as paid before the owner approves", async () => {
    const t = await setup("paid");
    cleanup.push(t.ownerUser.id, t.managerUser.id);
    await setApprovalThreshold(t.ownerActor, t.property.id, 10_000);

    await expect(
      recordMaintenanceExpense(t.managerActor, { requestId: t.request.id, vendorName: "V", description: "Paid early", finalAmountMinor: 80_000, isPaid: true }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("requires a note to reject or ask, approves at the requested amount, and only decides a pending item once", async () => {
    const t = await setup("decide");
    cleanup.push(t.ownerUser.id, t.managerUser.id);
    await setApprovalThreshold(t.ownerActor, t.property.id, 1_000);

    const expense = await recordMaintenanceExpense(t.managerActor, { requestId: t.request.id, vendorName: "ABC Cooling", description: "Compressor", estimateMinor: 275_000, isPaid: false });

    await expect(decideExpense(t.ownerActor, expense.id, "REJECT")).rejects.toThrow(ForbiddenError);

    const asked = await decideExpense(t.ownerActor, expense.id, "REQUEST_INFO", "Can we get another quote?");
    expect(asked.approvalStatus).toBe("INFO_REQUESTED");
    await expect(decideExpense(t.ownerActor, expense.id, "APPROVE")).rejects.toThrow(ForbiddenError); // not pending while waiting on the manager

    await respondToInfoRequest(t.managerActor, expense.id, "Second quote attached.");
    const approved = await decideExpense(t.ownerActor, expense.id, "APPROVE");
    expect(approved.approvalStatus).toBe("APPROVED");
    expect(approved.approvedAmountMinor).toBe(275_000);

    const thread = await prisma.expenseApprovalComment.findMany({ where: { expenseId: expense.id }, orderBy: { createdAt: "asc" } });
    expect(thread.map((c) => c.role)).toEqual(["OWNER", "MANAGER"]);
    await expect(decideExpense(t.ownerActor, expense.id, "REJECT", "too late")).rejects.toThrow(ForbiddenError);

    const audits = await prisma.auditLog.findMany({ where: { entityType: "MaintenanceExpense", entityId: expense.id, action: { startsWith: "tenant_management.expense_approval" } } });
    expect(audits.length).toBeGreaterThanOrEqual(3);
  });

  it("never lets one owner see, decide or set limits on another owner's property", async () => {
    const a = await setup("iso-a");
    const b = await setup("iso-b");
    cleanup.push(a.ownerUser.id, a.managerUser.id, b.ownerUser.id, b.managerUser.id);
    await setApprovalThreshold(a.ownerActor, a.property.id, 1_000);
    const expense = await recordMaintenanceExpense(a.managerActor, { requestId: a.request.id, vendorName: "V", description: "Job", estimateMinor: 50_000, isPaid: false });

    expect(await listPendingApprovalsForOwner(b.ownerActor)).toHaveLength(0);
    await expect(decideExpense(b.ownerActor, expense.id, "APPROVE")).rejects.toThrow(NotFoundError);
    await expect(setApprovalThreshold(b.ownerActor, a.property.id, 0)).rejects.toThrow(NotFoundError);
    // A manager can't decide for the owner either.
    await expect(decideExpense(a.managerActor, expense.id, "APPROVE")).rejects.toThrow();
  });
});
