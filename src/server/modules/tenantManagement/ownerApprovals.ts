import { prisma } from "@/server/db/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { notifyManagersOfDecision, notifyOwnerOfApproval } from "./approvalEmails";
import { assertPropertyAccess, requirePropertyOwner } from "./access";

export type OwnerDecision = "APPROVE" | "REJECT" | "REQUEST_INFO";

const approvalInclude = {
  request: { include: { property: { select: { id: true, name: true, ownerId: true } }, unit: { select: { label: true } } } },
  comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" as const } },
} as const;

export function expenseAmountMinor(e: { finalAmountMinor: number | null; approvedAmountMinor: number | null; estimateMinor: number | null }): number {
  return e.finalAmountMinor ?? e.approvedAmountMinor ?? e.estimateMinor ?? 0;
}

/** Expenses on this owner's properties waiting on them (PENDING) — never another owner's, even in the same management company. */
export async function listPendingApprovalsForOwner(actor: CurrentUser) {
  const { ownerId } = await requirePropertyOwner(actor);
  return prisma.maintenanceExpense.findMany({
    where: { approvalStatus: "PENDING", request: { property: { ownerId } } },
    include: approvalInclude,
    orderBy: { createdAt: "asc" },
  });
}

export async function countPendingApprovalsForOwner(ownerId: string): Promise<number> {
  return prisma.maintenanceExpense.count({ where: { approvalStatus: "PENDING", request: { property: { ownerId } } } });
}

async function getOwnedExpense(actor: CurrentUser, expenseId: string) {
  const { ownerId } = await requirePropertyOwner(actor);
  const expense = await prisma.maintenanceExpense.findUnique({ where: { id: expenseId }, include: approvalInclude });
  if (!expense || expense.request.property.ownerId !== ownerId) throw new NotFoundError("Approval");
  return expense;
}

/** Approve, reject or ask for more information. Rejecting or asking requires a note, only a PENDING item can be decided, and every decision is audited with the owner's reason. */
export async function decideExpense(actor: CurrentUser, expenseId: string, decision: OwnerDecision, note?: string) {
  const expense = await getOwnedExpense(actor, expenseId);
  if (expense.approvalStatus !== "PENDING") throw new ForbiddenError("This item is no longer waiting for a decision.");
  const trimmed = note?.trim();
  if (decision !== "APPROVE" && !trimmed) throw new ForbiddenError("Please add a short note explaining your decision.");

  const status = decision === "APPROVE" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "INFO_REQUESTED";

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.maintenanceExpense.update({
      where: { id: expense.id },
      data: {
        approvalStatus: status,
        ownerDecidedAt: new Date(),
        ...(decision === "APPROVE" ? { approvedAmountMinor: expenseAmountMinor(expense) } : {}),
      },
    });
    if (trimmed) await tx.expenseApprovalComment.create({ data: { expenseId: expense.id, authorUserId: actor.id, role: "OWNER", body: trimmed } });
    return row;
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: `tenant_management.expense_approval.${decision.toLowerCase()}`,
    entityType: "MaintenanceExpense",
    entityId: expense.id,
    before: { approvalStatus: expense.approvalStatus },
    after: { approvalStatus: updated.approvalStatus, amountMinor: expenseAmountMinor(expense), note: trimmed ?? null },
  });

  await notifyManagersOfDecision(expense.id, decision, trimmed ?? null);
  return updated;
}

/** The manager answers an information request; the item returns to the owner's queue. */
export async function respondToInfoRequest(actor: CurrentUser, expenseId: string, body: string) {
  const expense = await prisma.maintenanceExpense.findUnique({ where: { id: expenseId }, include: { request: true } });
  if (!expense) throw new NotFoundError("Expense");
  await assertPropertyAccess(actor, expense.request.propertyId);
  if (expense.approvalStatus !== "INFO_REQUESTED") throw new ForbiddenError("The owner hasn't asked for more information on this expense.");
  const trimmed = body.trim();
  if (!trimmed) throw new ForbiddenError("Write a reply for the owner.");

  await prisma.$transaction([
    prisma.expenseApprovalComment.create({ data: { expenseId, authorUserId: actor.id, role: "MANAGER", body: trimmed } }),
    prisma.maintenanceExpense.update({ where: { id: expenseId }, data: { approvalStatus: "PENDING" } }),
  ]);

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.expense_approval.info_provided",
    entityType: "MaintenanceExpense",
    entityId: expenseId,
    after: { note: trimmed },
  });
  await notifyOwnerOfApproval(expenseId, "answered");
}

/** Only the property's own owner can set (or clear, with null) their approval limit. */
export async function setApprovalThreshold(actor: CurrentUser, propertyId: string, thresholdMinor: number | null) {
  const { ownerId } = await requirePropertyOwner(actor);
  const property = await prisma.managedProperty.findUnique({ where: { id: propertyId } });
  if (!property || property.ownerId !== ownerId) throw new NotFoundError("Property");
  if (thresholdMinor !== null && (!Number.isInteger(thresholdMinor) || thresholdMinor < 0)) throw new ForbiddenError("Enter a valid amount.");

  const updated = await prisma.managedProperty.update({ where: { id: propertyId }, data: { ownerApprovalThresholdMinor: thresholdMinor } });
  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.property.approval_threshold_set",
    entityType: "ManagedProperty",
    entityId: propertyId,
    before: { thresholdMinor: property.ownerApprovalThresholdMinor },
    after: { thresholdMinor },
  });
  return updated;
}
