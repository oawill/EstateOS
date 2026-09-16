import { RentObligationStatus, RentPaymentMethod } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import type { CurrentUser } from "@/server/auth/session";
import { assertPropertyAccess, PROPERTY_OWNER_SAFE_SELECT } from "./access";
import { nextRentPaymentReference, nextRentReceiptNumber } from "./sequence";
import type { RecordRentPaymentInput } from "./schema";

/**
 * Derives an obligation's status from what's actually been paid against it
 * — never a plain paid/unpaid flag, so partial payments are always
 * visible. WAIVED/CANCELLED are terminal and never recomputed here; a
 * payment can't be allocated to either (see assertObligationIsPayable).
 */
function computeObligationStatus(amountDueMinor: number, amountPaidMinor: number, dueDate: Date, now: Date): RentObligationStatus {
  if (amountPaidMinor >= amountDueMinor) return "PAID";
  if (amountPaidMinor > 0) return "PARTIALLY_PAID";
  if (dueDate < now) return "OVERDUE";
  return dueDate <= now ? "DUE" : "UPCOMING";
}

function assertObligationIsPayable(status: RentObligationStatus) {
  if (status === "WAIVED" || status === "CANCELLED") {
    throw new ForbiddenError(`Cannot record a payment against a ${status.toLowerCase()} obligation`);
  }
}

export interface AllocationInput {
  rentObligationId?: string;
  chargeId?: string;
  amountMinor: number;
}

// Named distinctly from schema.ts's zod-derived RecordPaymentInput (the
// server-action-facing shape) — this is the lower-level service shape,
// which also accepts a few fields (gatewayReference) no form ever submits
// directly.
export interface RecordPaymentServiceInput {
  tenantId: string;
  leaseId: string;
  amountMinor: number;
  method: RentPaymentMethod;
  paidAt?: Date;
  transactionRef?: string;
  gatewayReference?: string;
  notes?: string;
  proofOfPaymentUrl?: string;
  allocations: AllocationInput[];
}

/**
 * The single place a Payment is ever created. Allocates the payment's
 * amount across one or more RentObligations/TenantCharges (never storing
 * everything as one generic "rent payment" — see PaymentAllocation).
 * Each target's applied amount is capped at what it actually still owes;
 * anything left over (an intentional over-allocation, or simply
 * `amountMinor` exceeding the sum of `allocations`) becomes an
 * unallocated PaymentAllocation row (both target FKs null) — the tenant's
 * account credit. This is what makes overpayment safe: an obligation's
 * amountPaidMinor can never exceed its amountDueMinor.
 */
export async function recordPayment(actor: CurrentUser, input: RecordPaymentServiceInput) {
  const lease = await prisma.lease.findUnique({ where: { id: input.leaseId }, include: { unit: true } });
  if (!lease) throw new NotFoundError("Lease");
  await assertPropertyAccess(actor, lease.unit.propertyId);
  if (lease.tenantId !== input.tenantId) throw new NotFoundError("Lease");

  const requestedTotal = input.allocations.reduce((sum, a) => sum + a.amountMinor, 0);
  if (requestedTotal > input.amountMinor) {
    throw new ForbiddenError("Allocations cannot exceed the payment amount");
  }

  const obligationIds = input.allocations.filter((a) => a.rentObligationId).map((a) => a.rentObligationId!);
  const chargeIds = input.allocations.filter((a) => a.chargeId).map((a) => a.chargeId!);

  const [obligations, charges] = await Promise.all([
    obligationIds.length ? prisma.rentObligation.findMany({ where: { id: { in: obligationIds } } }) : Promise.resolve([]),
    chargeIds.length ? prisma.tenantCharge.findMany({ where: { id: { in: chargeIds } } }) : Promise.resolve([]),
  ]);
  const obligationById = new Map(obligations.map((o) => [o.id, o]));
  const chargeById = new Map(charges.map((c) => [c.id, c]));

  for (const a of input.allocations) {
    if (a.rentObligationId) {
      const o = obligationById.get(a.rentObligationId);
      if (!o || o.leaseId !== input.leaseId) throw new NotFoundError("Rent obligation");
      assertObligationIsPayable(o.status);
    } else if (a.chargeId) {
      const c = chargeById.get(a.chargeId);
      if (!c || c.tenantId !== input.tenantId) throw new NotFoundError("Charge");
    }
  }

  const referenceNumber = await nextRentPaymentReference();
  const receiptNumber = await nextRentReceiptNumber();
  const paidAt = input.paidAt ?? new Date();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.rentPayment.create({
      data: {
        referenceNumber,
        tenantId: input.tenantId,
        leaseId: input.leaseId,
        // Legacy convenience pointer — set to the first obligation allocation, if any.
        obligationId: input.allocations.find((a) => a.rentObligationId)?.rentObligationId ?? null,
        amountMinor: input.amountMinor,
        paidAt,
        method: input.method,
        transactionRef: input.transactionRef || null,
        gatewayReference: input.gatewayReference || null,
        notes: input.notes || null,
        proofOfPaymentUrl: input.proofOfPaymentUrl || null,
      },
    });

    const receipt = await tx.rentReceipt.create({ data: { paymentId: payment.id, receiptNumber } });

    let remaining = input.amountMinor;
    const allocationRows: { rentObligationId: string | null; chargeId: string | null; amountMinor: number }[] = [];
    const updatedObligations: Awaited<ReturnType<typeof tx.rentObligation.update>>[] = [];
    const updatedCharges: Awaited<ReturnType<typeof tx.tenantCharge.update>>[] = [];

    for (const a of input.allocations) {
      if (a.rentObligationId) {
        const o = obligationById.get(a.rentObligationId)!;
        const outstanding = o.amountDueMinor - o.amountPaidMinor;
        const applied = Math.min(a.amountMinor, outstanding, remaining);
        if (applied > 0) {
          const newAmountPaid = o.amountPaidMinor + applied;
          const updated = await tx.rentObligation.update({
            where: { id: o.id },
            data: { amountPaidMinor: newAmountPaid, status: computeObligationStatus(o.amountDueMinor, newAmountPaid, o.dueDate, now) },
          });
          updatedObligations.push(updated);
          allocationRows.push({ rentObligationId: o.id, chargeId: null, amountMinor: applied });
          remaining -= applied;
        }
      } else if (a.chargeId) {
        const c = chargeById.get(a.chargeId)!;
        const outstanding = c.amountMinor - c.amountPaidMinor;
        const applied = Math.min(a.amountMinor, outstanding, remaining);
        if (applied > 0) {
          const newAmountPaid = c.amountPaidMinor + applied;
          const updated = await tx.tenantCharge.update({
            where: { id: c.id },
            data: {
              amountPaidMinor: newAmountPaid,
              status: newAmountPaid >= c.amountMinor ? "PAID" : "PARTIALLY_PAID",
            },
          });
          updatedCharges.push(updated);
          allocationRows.push({ rentObligationId: null, chargeId: c.id, amountMinor: applied });
          remaining -= applied;
        }
      }
    }

    // Anything left over — either an explicit over-allocation or simply
    // amountMinor exceeding the sum of requested allocations — becomes an
    // unallocated credit row rather than being silently dropped.
    if (remaining > 0) {
      allocationRows.push({ rentObligationId: null, chargeId: null, amountMinor: remaining });
    }

    await tx.paymentAllocation.createMany({ data: allocationRows.map((r) => ({ ...r, paymentId: payment.id })) });

    return { payment, receipt, updatedObligations, updatedCharges, creditMinor: remaining };
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.payment.recorded",
    entityType: "RentPayment",
    entityId: result.payment.id,
    after: result,
  });

  return result;
}

/**
 * Backward-compatible entry point for the existing single-obligation
 * payment form — a thin wrapper over recordPayment() with one allocation,
 * kept so the dashboard's "Record a payment" flow and its tests don't need
 * to change shape.
 */
export async function recordRentPayment(actor: CurrentUser, input: RecordRentPaymentInput) {
  const obligation = await prisma.rentObligation.findUnique({
    where: { id: input.obligationId },
    include: { lease: { include: { unit: true } } },
  });
  if (!obligation) throw new NotFoundError("Rent obligation");

  const result = await recordPayment(actor, {
    tenantId: obligation.lease.tenantId,
    leaseId: obligation.leaseId,
    amountMinor: input.amountMinor,
    method: input.method,
    paidAt: input.paidAt,
    transactionRef: input.transactionRef,
    notes: input.notes,
    allocations: [{ rentObligationId: obligation.id, amountMinor: input.amountMinor }],
  });

  const updatedObligation =
    result.updatedObligations[0] ?? (await prisma.rentObligation.findUniqueOrThrow({ where: { id: obligation.id } }));

  return { payment: result.payment, receipt: result.receipt, obligation: updatedObligation };
}

/**
 * Reverses a completed payment without ever deleting it — the original
 * RentPayment row, its receipt, and its allocations all stay exactly as
 * they were; only reversedAt/reversedByUserId/reversalReason and status
 * change, and every obligation/charge the payment touched has its
 * amountPaidMinor rolled back by that allocation's amount (never below 0)
 * with its status recomputed. This is the only sanctioned way to correct
 * a mistaken payment — see IMPORTANT FINANCIAL RULE in the phase-2 spec.
 */
export async function reversePayment(actor: CurrentUser, paymentId: string, reason: string) {
  const payment = await prisma.rentPayment.findUnique({
    where: { id: paymentId },
    include: { lease: { include: { unit: true } }, allocations: true },
  });
  if (!payment) throw new NotFoundError("Payment");
  await assertPropertyAccess(actor, payment.lease.unit.propertyId);
  if (payment.status === "REVERSED") throw new ForbiddenError("Payment has already been reversed");
  if (!reason.trim()) throw new ForbiddenError("A reversal reason is required");

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    for (const allocation of payment.allocations) {
      if (allocation.rentObligationId) {
        const o = await tx.rentObligation.findUniqueOrThrow({ where: { id: allocation.rentObligationId } });
        const newAmountPaid = Math.max(o.amountPaidMinor - allocation.amountMinor, 0);
        await tx.rentObligation.update({
          where: { id: o.id },
          data: {
            amountPaidMinor: newAmountPaid,
            status:
              o.status === "WAIVED" || o.status === "CANCELLED"
                ? o.status
                : computeObligationStatus(o.amountDueMinor, newAmountPaid, o.dueDate, now),
          },
        });
      } else if (allocation.chargeId) {
        const c = await tx.tenantCharge.findUniqueOrThrow({ where: { id: allocation.chargeId } });
        const newAmountPaid = Math.max(c.amountPaidMinor - allocation.amountMinor, 0);
        await tx.tenantCharge.update({
          where: { id: c.id },
          data: { amountPaidMinor: newAmountPaid, status: newAmountPaid >= c.amountMinor ? "PAID" : newAmountPaid > 0 ? "PARTIALLY_PAID" : "PENDING" },
        });
      }
      // allocation.rentObligationId === null && chargeId === null: an
      // unallocated credit row — reversing the payment simply removes that
      // credit along with everything else, nothing further to roll back.
    }

    return tx.rentPayment.update({
      where: { id: paymentId },
      data: { status: "REVERSED", reversedAt: now, reversedByUserId: actor.id, reversalReason: reason },
    });
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.payment.reversed",
    entityType: "RentPayment",
    entityId: paymentId,
    before: payment,
    after: updated, // includes reversalReason
  });

  return updated;
}

/** Waives the remaining balance on an obligation — the original amount is preserved via adjustmentsMinor, never mutated in place. */
export async function waiveObligation(actor: CurrentUser, obligationId: string, reason: string) {
  const obligation = await prisma.rentObligation.findUnique({
    where: { id: obligationId },
    include: { lease: { include: { unit: true } } },
  });
  if (!obligation) throw new NotFoundError("Rent obligation");
  await assertPropertyAccess(actor, obligation.lease.unit.propertyId);
  if (!reason.trim()) throw new ForbiddenError("A reason is required to waive an obligation");

  const outstanding = obligation.amountDueMinor - obligation.amountPaidMinor;
  const updated = await prisma.rentObligation.update({
    where: { id: obligationId },
    data: {
      adjustmentsMinor: obligation.adjustmentsMinor - outstanding,
      amountDueMinor: obligation.amountDueMinor - outstanding,
      status: "WAIVED",
      notes: obligation.notes ? `${obligation.notes}\nWaived: ${reason}` : `Waived: ${reason}`,
    },
  });

  await recordAudit({
    estateId: null,
    actorUserId: actor.id,
    action: "tenant_management.obligation.waived",
    entityType: "RentObligation",
    entityId: obligationId,
    before: obligation,
    after: updated,
  });

  return updated;
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

export interface ArrearsFilters {
  propertyId?: string;
  tenantId?: string;
  minAgeDays?: number;
  minAmountMinor?: number;
}

export async function getArrears(propertyIds: string[] | "all", filters: ArrearsFilters = {}) {
  await recomputeOverdueObligations();

  // filters.propertyId narrows within whatever the caller is already
  // authorized to see — it's never allowed to widen access, so when
  // propertyIds is a concrete list we intersect rather than override it.
  const authorizedPropertyFilter =
    propertyIds === "all"
      ? filters.propertyId
        ? { propertyId: filters.propertyId }
        : undefined
      : { propertyId: filters.propertyId ? { in: propertyIds.filter((id) => id === filters.propertyId) } : { in: propertyIds } };

  const obligations = await prisma.rentObligation.findMany({
    where: {
      status: { in: ["OVERDUE", "PARTIALLY_PAID"] },
      dueDate: { lt: new Date() },
      lease: {
        tenantId: filters.tenantId,
        unit: authorizedPropertyFilter,
      },
    },
    include: {
      lease: { include: { tenant: true, unit: { include: { property: { include: { owner: { select: PROPERTY_OWNER_SAFE_SELECT } } } } } } },
      payments: { orderBy: { paidAt: "desc" }, take: 1 },
    },
    orderBy: { dueDate: "asc" },
  });

  const now = Date.now();
  const rows = obligations
    .map((o) => {
      const daysOverdue = Math.floor((now - o.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const bucket = ARREARS_BUCKETS.find((b) => daysOverdue >= b.min && daysOverdue <= b.max)?.label ?? "1-30";
      return {
        obligationId: o.id,
        tenant: o.lease.tenant,
        property: o.lease.unit.property,
        owner: o.lease.unit.property.owner,
        unit: o.lease.unit,
        amountDueMinor: o.amountDueMinor,
        amountPaidMinor: o.amountPaidMinor,
        outstandingMinor: o.amountDueMinor - o.amountPaidMinor,
        originalDueDate: o.dueDate,
        daysOverdue,
        lastPayment: o.payments[0] ?? null,
        bucket,
      };
    })
    .filter((r) => (filters.minAgeDays ? r.daysOverdue >= filters.minAgeDays : true))
    .filter((r) => (filters.minAmountMinor ? r.outstandingMinor >= filters.minAmountMinor : true));

  const grouped = Object.fromEntries(ARREARS_BUCKETS.map((b) => [b.label, rows.filter((r) => r.bucket === b.label)]));
  return { rows, grouped };
}

/**
 * The tenant-facing financial ledger — everything the tenant portal needs
 * to answer "how much do I owe / when's it due / have I overpaid" without
 * exposing accounting jargon. A positive currentBalanceMinor is money
 * owed; a negative one is a credit (shown separately as `creditMinor` so
 * the UI never has to explain a negative number on its own).
 */
export async function getTenantBalance(tenantId: string) {
  const obligations = await prisma.rentObligation.findMany({
    where: { lease: { tenantId }, status: { notIn: ["CANCELLED"] } },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const outstanding = obligations.reduce((sum, o) => sum + Math.max(o.amountDueMinor - o.amountPaidMinor, 0), 0);
  const overdueMinor = obligations
    .filter((o) => o.status === "OVERDUE" || (o.status === "PARTIALLY_PAID" && o.dueDate < now))
    .reduce((sum, o) => sum + Math.max(o.amountDueMinor - o.amountPaidMinor, 0), 0);

  const creditAllocations = await prisma.paymentAllocation.findMany({
    where: { rentObligationId: null, chargeId: null, payment: { tenantId, status: { not: "REVERSED" } } },
  });
  const creditMinor = creditAllocations.reduce((sum, a) => sum + a.amountMinor, 0);

  const nextObligation = obligations.find((o) => o.status !== "PAID" && o.status !== "WAIVED") ?? null;

  const [recentPayments, upcomingObligations] = await Promise.all([
    prisma.rentPayment.findMany({ where: { tenantId, status: { not: "REVERSED" } }, orderBy: { paidAt: "desc" }, take: 5 }),
    Promise.resolve(obligations.filter((o) => o.status === "UPCOMING").slice(0, 5)),
  ]);

  return {
    currentBalanceMinor: Math.max(outstanding - creditMinor, 0),
    creditMinor: Math.max(creditMinor - outstanding, 0),
    overdueMinor,
    nextObligation,
    recentPayments,
    upcomingObligations,
  };
}

/**
 * Collected / Due × 100 for a period — deliberately excludes UPCOMING
 * (rent not yet due has no business inflating a collection rate),
 * WAIVED, and CANCELLED obligations from the denominator, and only counts
 * COMPLETED payments (never PENDING/FAILED/ABANDONED/REVERSED) in the
 * numerator.
 */
export async function getCollectionRate(propertyIds: string[] | "all", periodStart: Date, periodEnd: Date) {
  const obligations = await prisma.rentObligation.findMany({
    where: {
      dueDate: { gte: periodStart, lt: periodEnd },
      status: { notIn: ["UPCOMING", "WAIVED", "CANCELLED"] },
      lease: { unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } },
    },
  });

  const dueMinor = obligations.reduce((sum, o) => sum + o.amountDueMinor, 0);
  const collectedMinor = obligations.reduce((sum, o) => sum + o.amountPaidMinor, 0);
  const rate = dueMinor > 0 ? Math.round((collectedMinor / dueMinor) * 100) : 0;

  return { dueMinor, collectedMinor, rate };
}

export async function listAccessiblePayments(propertyIds: string[] | "all", limit = 30) {
  return prisma.rentPayment.findMany({
    where: { lease: { unit: propertyIds === "all" ? undefined : { propertyId: { in: propertyIds } } } },
    include: { tenant: true, lease: { include: { unit: { include: { property: true } } } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
