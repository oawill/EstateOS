import { randomUUID } from "node:crypto";
import { ChargeTargetType, type PropertyType, Prisma } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { formatSequenceCode, nextSequenceNumber } from "@/server/modules/sequence";
import { prisma } from "@/server/db/client";
import { scoped } from "@/server/db/scoped";
import { initializePaystackTransaction } from "./paystack";
import type { CreateChargeInput, RecordManualPaymentInput } from "./schema";

// ---------------------------------------------------------------------------
// Charges & invoice generation
// ---------------------------------------------------------------------------

async function resolveTargetUnitIds(
  estateId: string,
  targetType: ChargeTargetType,
  criteria: Record<string, unknown>,
): Promise<string[]> {
  const where: Prisma.UnitWhereInput = { estateId };

  switch (targetType) {
    case ChargeTargetType.ENTIRE_ESTATE:
      break;
    case ChargeTargetType.BLOCK:
      where.property = { blockId: { in: criteria.blockIds as string[] } };
      break;
    case ChargeTargetType.STREET:
      where.property = { streetId: { in: criteria.streetIds as string[] } };
      break;
    case ChargeTargetType.PROPERTY_TYPE:
      where.property = { propertyType: { in: criteria.propertyTypes as PropertyType[] } };
      break;
    case ChargeTargetType.SELECTED_PROPERTIES:
      where.propertyId = { in: criteria.propertyIds as string[] };
      break;
  }

  const units = await prisma.unit.findMany({ where, select: { id: true } });
  return units.map((u) => u.id);
}

/** Prefers the current owner, falls back to a tenant; household members aren't billed. */
export async function currentBillableResidentId(
  client: { occupancy: { findMany(args: unknown): Promise<{ role: string; residentId: string }[]> } },
  unitId: string,
): Promise<string | null> {
  const occupancies = await client.occupancy.findMany({
    where: { unitId, isCurrent: true, role: { in: ["OWNER", "TENANT"] } },
  });
  const owner = occupancies.find((o) => o.role === "OWNER");
  const tenant = occupancies.find((o) => o.role === "TENANT");
  return (owner ?? tenant)?.residentId ?? null;
}

export async function createChargeAndGenerateInvoices(
  estateId: string,
  actorUserId: string,
  input: CreateChargeInput,
) {
  const criteria = input.targetCriteria as Record<string, unknown>;
  const unitIds = await resolveTargetUnitIds(estateId, input.targetType, criteria);

  const { charge, invoiceCount } = await prisma.$transaction(
    async (tx) => {
      const charge = await tx.charge.create({
        data: {
          estateId,
          title: input.title,
          description: input.description || null,
          chargeType: input.chargeType,
          amountKobo: input.amountKobo,
          dueDate: input.dueDate,
          targetType: input.targetType,
          targetCriteria: criteria as Prisma.InputJsonValue,
        },
      });

      let invoiceCount = 0;
      for (const unitId of unitIds) {
        const residentId = await currentBillableResidentId(tx, unitId);
        if (!residentId) continue; // vacant unit — nobody to bill yet

        const seq = await nextSequenceNumber(tx, estateId, "invoice");
        await tx.invoice.create({
          data: {
            estateId,
            chargeId: charge.id,
            unitId,
            residentId,
            invoiceNumber: formatSequenceCode("INV", seq),
            amountKobo: input.amountKobo,
            dueDate: input.dueDate,
            status: "PENDING",
          },
        });
        invoiceCount += 1;
      }

      return { charge, invoiceCount };
    },
    { timeout: 30_000 },
  );

  await recordAudit({
    estateId,
    actorUserId,
    action: "charge.created",
    entityType: "Charge",
    entityId: charge.id,
    after: { ...charge, targetedUnits: unitIds.length, invoicesGenerated: invoiceCount },
  });

  return charge;
}

const chargeWithCount = Prisma.validator<Prisma.ChargeDefaultArgs>()({
  include: { _count: { select: { invoices: true } } },
});
export type ChargeWithCount = Prisma.ChargeGetPayload<typeof chargeWithCount>;

export async function listCharges(estateId: string) {
  return scoped(estateId).charge.findMany<ChargeWithCount>({
    orderBy: { createdAt: "desc" },
    include: chargeWithCount.include,
  });
}

const invoiceWithRelations = Prisma.validator<Prisma.InvoiceDefaultArgs>()({
  include: {
    charge: true,
    unit: { include: { property: true } },
    resident: true,
    payments: { where: { status: "SUCCESSFUL" }, include: { receipt: true } },
  },
});
export type InvoiceWithRelations = Prisma.InvoiceGetPayload<typeof invoiceWithRelations>;

export async function listInvoices(estateId: string, filter?: { status?: string }) {
  return scoped(estateId).invoice.findMany<InvoiceWithRelations>({
    where: filter?.status ? ({ status: filter.status } as never) : undefined,
    orderBy: { createdAt: "desc" },
    include: invoiceWithRelations.include,
  });
}

export async function listInvoicesForResident(estateId: string, residentId: string) {
  return scoped(estateId).invoice.findMany<InvoiceWithRelations>({
    where: { residentId } as never,
    orderBy: { createdAt: "desc" },
    include: invoiceWithRelations.include,
  });
}

export async function getResidentOutstandingBalanceKobo(estateId: string, residentId: string): Promise<number> {
  const openInvoices = await prisma.invoice.findMany({
    where: { estateId, residentId, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
    include: { payments: { where: { status: "SUCCESSFUL" } } },
  });

  return openInvoices.reduce((total, invoice) => {
    const paidKobo = invoice.payments.reduce((sum, p) => sum + p.amountKobo, 0);
    return total + (invoice.amountKobo - paidKobo);
  }, 0);
}

// ---------------------------------------------------------------------------
// Payments (shared finalization for both Paystack and manual paths)
// ---------------------------------------------------------------------------

/**
 * The single place a payment is ever marked successful. Recomputes the
 * invoice's status from the sum of *all* successful payments against it
 * (not just this one), issues a receipt, and writes the audit record —
 * called by both the Paystack webhook and manual-approval so the two
 * payment paths can never drift apart.
 */
export async function applySuccessfulPayment(paymentId: string, actorUserId: string | null) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError("Payment");
    if (payment.status === "SUCCESSFUL") return; // idempotent — already applied

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESSFUL", paidAt: new Date() },
    });

    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });
    const successfulPayments = await tx.payment.findMany({
      where: { invoiceId: invoice.id, status: "SUCCESSFUL" },
    });
    const totalPaidKobo = successfulPayments.reduce((sum, p) => sum + p.amountKobo, 0) + payment.amountKobo;
    const newStatus = totalPaidKobo >= invoice.amountKobo ? "PAID" : "PARTIALLY_PAID";

    await tx.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } });

    const seq = await nextSequenceNumber(tx, payment.estateId, "receipt");
    await tx.receipt.create({
      data: {
        estateId: payment.estateId,
        paymentId: payment.id,
        receiptNumber: formatSequenceCode("RCT", seq),
      },
    });

    await recordAudit({
      estateId: payment.estateId,
      actorUserId,
      action: "payment.succeeded",
      entityType: "Payment",
      entityId: payment.id,
      after: { paymentId: payment.id, invoiceId: invoice.id, amountKobo: payment.amountKobo, newInvoiceStatus: newStatus },
    });
  });
}

export async function recordManualPayment(
  estateId: string,
  residentId: string,
  actorUserId: string,
  input: RecordManualPaymentInput,
) {
  const invoice = await scoped(estateId).invoice.findById(input.invoiceId);
  if (!invoice || invoice.residentId !== residentId) throw new NotFoundError("Invoice");

  const payment = await scoped(estateId).payment.create({
    invoiceId: invoice.id,
    amountKobo: input.amountKobo,
    method: "MANUAL_BANK_TRANSFER",
    status: "PENDING",
    note: input.note || null,
    recordedByUserId: actorUserId,
  });

  await recordAudit({
    estateId,
    actorUserId,
    action: "payment.manual_recorded",
    entityType: "Payment",
    entityId: payment.id,
    after: payment,
  });

  return payment;
}

const pendingManualPaymentWithRelations = Prisma.validator<Prisma.PaymentDefaultArgs>()({
  include: { invoice: { include: { resident: true, unit: { include: { property: true } } } } },
});
export type PendingManualPayment = Prisma.PaymentGetPayload<typeof pendingManualPaymentWithRelations>;

export async function listPendingManualPayments(estateId: string) {
  return scoped(estateId).payment.findMany<PendingManualPayment>({
    where: { method: "MANUAL_BANK_TRANSFER", status: "PENDING" } as never,
    orderBy: { createdAt: "asc" },
    include: pendingManualPaymentWithRelations.include,
  });
}

export async function approveManualPayment(estateId: string, actorUserId: string, paymentId: string) {
  const payment = await scoped(estateId).payment.findById(paymentId);
  if (!payment) throw new NotFoundError("Payment");
  if (payment.method !== "MANUAL_BANK_TRANSFER" || payment.status !== "PENDING") {
    throw new ForbiddenError("Only pending manual payments can be approved");
  }

  await scoped(estateId).payment.update(paymentId, { approvedByUserId: actorUserId, approvedAt: new Date() });
  await applySuccessfulPayment(paymentId, actorUserId);
}

export async function rejectManualPayment(estateId: string, actorUserId: string, paymentId: string) {
  const payment = await scoped(estateId).payment.findById(paymentId);
  if (!payment) throw new NotFoundError("Payment");
  if (payment.method !== "MANUAL_BANK_TRANSFER" || payment.status !== "PENDING") {
    throw new ForbiddenError("Only pending manual payments can be rejected");
  }

  await scoped(estateId).payment.update(paymentId, { status: "FAILED" });
  await recordAudit({
    estateId,
    actorUserId,
    action: "payment.manual_rejected",
    entityType: "Payment",
    entityId: paymentId,
  });
}

// ---------------------------------------------------------------------------
// Paystack online payment
// ---------------------------------------------------------------------------

export async function initiatePaystackPayment(
  estateId: string,
  resident: { id: string; email: string | null },
  invoiceId: string,
  callbackUrl: string,
) {
  const invoice = await scoped(estateId).invoice.findById(invoiceId);
  if (!invoice || invoice.residentId !== resident.id) throw new NotFoundError("Invoice");
  if (!resident.email) throw new ForbiddenError("Add an email address to your profile before paying online");

  const reference = `EOS-${randomUUID()}`;

  await scoped(estateId).payment.create({
    invoiceId: invoice.id,
    amountKobo: invoice.amountKobo,
    method: "PAYSTACK_CARD",
    status: "PENDING",
    paystackReference: reference,
  });

  const { authorizationUrl } = await initializePaystackTransaction({
    email: resident.email,
    amountKobo: invoice.amountKobo,
    reference,
    callbackUrl,
    metadata: { estateId, invoiceId: invoice.id, residentId: resident.id },
  });

  return authorizationUrl;
}

/** Called only by the signature-verified webhook route — see app/api/webhooks/paystack/route.ts. */
export async function handlePaystackChargeSuccess(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } });
  if (!payment) return; // unknown reference — nothing to reconcile, ack and move on
  if (payment.status === "SUCCESSFUL") return; // idempotent replay
  await applySuccessfulPayment(payment.id, null);
}

// ---------------------------------------------------------------------------
// Finance dashboard
// ---------------------------------------------------------------------------

export async function getFinanceSummary(estateId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [collectionsToday, collectionsThisMonth, collectionsThisYear, openInvoices] = await Promise.all([
    prisma.payment.aggregate({
      where: { estateId, status: "SUCCESSFUL", paidAt: { gte: startOfToday } },
      _sum: { amountKobo: true },
    }),
    prisma.payment.aggregate({
      where: { estateId, status: "SUCCESSFUL", paidAt: { gte: startOfMonth } },
      _sum: { amountKobo: true },
    }),
    prisma.payment.aggregate({
      where: { estateId, status: "SUCCESSFUL", paidAt: { gte: startOfYear } },
      _sum: { amountKobo: true },
    }),
    prisma.invoice.findMany({
      where: { estateId, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
      include: { payments: { where: { status: "SUCCESSFUL" } } },
    }),
  ]);

  let outstandingKobo = 0;
  let overdueCount = 0;
  for (const invoice of openInvoices) {
    const paidKobo = invoice.payments.reduce((sum, p) => sum + p.amountKobo, 0);
    outstandingKobo += invoice.amountKobo - paidKobo;
    if (invoice.dueDate < now) overdueCount += 1;
  }

  return {
    collectionsTodayKobo: collectionsToday._sum.amountKobo ?? 0,
    collectionsThisMonthKobo: collectionsThisMonth._sum.amountKobo ?? 0,
    collectionsThisYearKobo: collectionsThisYear._sum.amountKobo ?? 0,
    outstandingKobo,
    overdueCount,
  };
}
