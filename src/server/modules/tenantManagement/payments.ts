import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess } from "./access";
import { nextRentPaymentReference, nextRentReceiptNumber } from "./sequence";
import type { RecordRentPaymentInput } from "./schema";

/** Derives an obligation's status from what's actually been paid against it — never a plain paid/unpaid flag, so partial payments are always visible. */
function computeObligationStatus(amountDueMinor: number, amountPaidMinor: number, dueDate: Date, now: Date): "UPCOMING" | "DUE" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" {
  if (amountPaidMinor >= amountDueMinor) return "PAID";
  if (amountPaidMinor > 0) return "PARTIALLY_PAID";
  if (dueDate < now) return "OVERDUE";
  return dueDate <= now ? "DUE" : "UPCOMING";
}

/**
 * Records a payment against a specific rent obligation and recomputes that
 * obligation's status from the new running total — a partial payment never
 * flips an obligation straight to PAID. Also mints a receipt.
 */
export async function recordRentPayment(actor: CurrentUser, input: RecordRentPaymentInput) {
  const obligation = await prisma.rentObligation.findUnique({
    where: { id: input.obligationId },
    include: { lease: { include: { unit: true } } },
  });
  if (!obligation) throw new NotFoundError("Rent obligation");
  await assertPropertyAccess(actor, obligation.lease.unit.propertyId);

  const referenceNumber = await nextRentPaymentReference();
  const receiptNumber = await nextRentReceiptNumber();
  const paidAt = input.paidAt ?? new Date();

  const { payment, receipt, updatedObligation } = await prisma.$transaction(async (tx) => {
    const payment = await tx.rentPayment.create({
      data: {
        referenceNumber,
        tenantId: obligation.lease.tenantId,
        leaseId: obligation.leaseId,
        obligationId: obligation.id,
        amountMinor: input.amountMinor,
        paidAt,
        method: input.method,
        transactionRef: input.transactionRef || null,
        recordedByUserId: actor.id,
        notes: input.notes || null,
      },
    });

    const receipt = await tx.rentReceipt.create({
      data: { paymentId: payment.id, receiptNumber },
    });

    const newAmountPaid = obligation.amountPaidMinor + input.amountMinor;
    const newStatus = computeObligationStatus(obligation.amountDueMinor, newAmountPaid, obligation.dueDate, new Date());

    const updatedObligation = await tx.rentObligation.update({
      where: { id: obligation.id },
      data: { amountPaidMinor: newAmountPaid, status: newStatus },
    });

    return { payment, receipt, updatedObligation };
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.rent_payment.recorded",
    entityType: "RentPayment",
    entityId: payment.id,
    after: { payment, obligation: updatedObligation },
  });

  return { payment, receipt, obligation: updatedObligation };
}

/** Sweeps obligations whose due date has passed into OVERDUE/PARTIALLY_PAID as appropriate — call before reading arrears/dashboard data so status reflects "today," not just the last payment event. */
export async function listOutstandingObligations(propertyIds: string[] | "all") {
  return prisma.rentObligation.findMany({
    where: {
      status: { in: ["UPCOMING", "DUE", "PARTIALLY_PAID", "OVERDUE"] },
      lease: { unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } },
    },
    include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } },
    orderBy: { dueDate: "asc" },
  });
}

export async function recomputeOverdueObligations() {
  const now = new Date();
  const candidates = await prisma.rentObligation.findMany({
    where: { dueDate: { lt: now }, status: { in: ["UPCOMING", "DUE"] } },
  });

  await Promise.all(
    candidates.map((o) =>
      prisma.rentObligation.update({
        where: { id: o.id },
        data: { status: o.amountPaidMinor > 0 ? "PARTIALLY_PAID" : "OVERDUE" },
      }),
    ),
  );
}

const ARREARS_BUCKETS = [
  { label: "1-30", min: 1, max: 30 },
  { label: "31-60", min: 31, max: 60 },
  { label: "61-90", min: 61, max: 90 },
  { label: "90+", min: 91, max: Infinity },
] as const;

export async function getArrears(propertyIds: string[] | "all") {
  await recomputeOverdueObligations();

  const obligations = await prisma.rentObligation.findMany({
    where: {
      status: { in: ["OVERDUE", "PARTIALLY_PAID"] },
      dueDate: { lt: new Date() },
      lease: { unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } },
    },
    include: {
      lease: { include: { tenant: true, unit: { include: { property: true } } } },
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
    },
    orderBy: { dueDate: "asc" },
  });

  const now = Date.now();
  const rows = obligations.map((o) => {
    const daysOverdue = Math.floor((now - o.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const bucket = ARREARS_BUCKETS.find((b) => daysOverdue >= b.min && daysOverdue <= b.max)?.label ?? "1-30";
    return {
      obligationId: o.id,
      tenant: o.lease.tenant,
      property: o.lease.unit.property,
      unit: o.lease.unit,
      outstandingMinor: o.amountDueMinor - o.amountPaidMinor,
      originalDueDate: o.dueDate,
      daysOverdue,
      lastPayment: o.payments[0] ?? null,
      bucket,
    };
  });

  const grouped = Object.fromEntries(ARREARS_BUCKETS.map((b) => [b.label, rows.filter((r) => r.bucket === b.label)]));
  return { rows, grouped };
}
