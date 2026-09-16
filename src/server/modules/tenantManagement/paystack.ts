import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/db/client";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAudit } from "@/server/modules/audit";
import { nextRentPaymentReference, nextRentReceiptNumber } from "./sequence";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_PUBLIC_KEY && process.env.PAYSTACK_WEBHOOK_SECRET);
}

export class PaystackNotConfiguredError extends Error {
  constructor() {
    super("Paystack isn't configured on this server — set PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY and PAYSTACK_WEBHOOK_SECRET.");
    this.name = "PaystackNotConfiguredError";
  }
}

/**
 * Verifies `x-paystack-signature` against the raw body using
 * PAYSTACK_WEBHOOK_SECRET — deliberately a separate env var from the
 * secret key, matching Paystack's own webhook-signing key concept, even
 * though Paystack in practice signs with the account secret key today.
 * Kept distinct so rotating one never silently breaks the other.
 */
export function verifyTenantPaystackSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(signatureHeader, "hex");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

interface InitializeResult {
  authorizationUrl: string;
  reference: string;
}

/**
 * Starts a Paystack checkout for one rent obligation. A PENDING RentPayment
 * row (and its allocation) is created *before* Paystack is ever called —
 * the browser redirect that follows is never treated as confirmation; only
 * the signature-verified webhook (handleTenantPaystackWebhook below) can
 * move this row to COMPLETED and update the obligation's ledger.
 */
export async function initializeTenantRentPayment(params: {
  tenantId: string;
  obligationId: string;
  amountMinor: number;
  email: string;
  callbackUrl: string;
}): Promise<InitializeResult> {
  if (!isPaystackConfigured()) throw new PaystackNotConfiguredError();

  const obligation = await prisma.rentObligation.findUnique({
    where: { id: params.obligationId },
    include: { lease: true },
  });
  if (!obligation) throw new NotFoundError("Rent obligation");
  if (obligation.lease.tenantId !== params.tenantId) throw new ForbiddenError();
  if (obligation.status === "WAIVED" || obligation.status === "CANCELLED") {
    throw new ForbiddenError(`Cannot pay a ${obligation.status.toLowerCase()} obligation`);
  }

  const outstanding = obligation.amountDueMinor - obligation.amountPaidMinor;
  if (params.amountMinor > outstanding) throw new ForbiddenError("Amount exceeds the outstanding balance");

  const referenceNumber = await nextRentPaymentReference();
  const receiptNumber = await nextRentReceiptNumber();

  const payment = await prisma.$transaction(async (tx) => {
    const payment = await tx.rentPayment.create({
      data: {
        referenceNumber,
        tenantId: params.tenantId,
        leaseId: obligation.leaseId,
        obligationId: obligation.id,
        amountMinor: params.amountMinor,
        method: "ONLINE_PAYMENT",
        status: "PENDING",
        gatewayReference: referenceNumber,
      },
    });
    await tx.paymentAllocation.create({
      data: { paymentId: payment.id, rentObligationId: obligation.id, amountMinor: params.amountMinor },
    });
    // The receipt is minted now but only ever shown to the tenant once the
    // payment is COMPLETED — see getReceiptForPayment().
    await tx.rentReceipt.create({ data: { paymentId: payment.id, receiptNumber } });
    return payment;
  });

  const secretKey = process.env.PAYSTACK_SECRET_KEY!;
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountMinor,
      reference: referenceNumber,
      callback_url: params.callbackUrl,
      metadata: { tenantId: params.tenantId, obligationId: params.obligationId, paymentId: payment.id },
    }),
  });

  const body = await response.json();
  if (!response.ok || !body.status) {
    await prisma.rentPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw new Error(`Paystack initialize failed: ${body.message ?? response.statusText}`);
  }

  return { authorizationUrl: body.data.authorization_url, reference: referenceNumber };
}

/**
 * Applies a successful charge to the ledger — shared by the webhook
 * handler and the manual verify() fallback below, so there's exactly one
 * place that ever flips a payment to COMPLETED and updates its
 * obligations. Idempotent via the `status === "COMPLETED"` guard: calling
 * this twice for the same payment (webhook races verify, or a retried
 * webhook slips past the event-log dedupe) is always a safe no-op the
 * second time.
 */
async function applyPaystackChargeSuccess(payment: { id: string; status: string; allocations: { rentObligationId: string | null; amountMinor: number }[] }) {
  if (payment.status === "COMPLETED") return { status: "already_completed" as const };

  await prisma.$transaction(async (tx) => {
    await tx.rentPayment.update({ where: { id: payment.id }, data: { status: "COMPLETED" } });
    for (const allocation of payment.allocations) {
      if (allocation.rentObligationId) {
        const o = await tx.rentObligation.findUniqueOrThrow({ where: { id: allocation.rentObligationId } });
        const newAmountPaid = o.amountPaidMinor + allocation.amountMinor;
        await tx.rentObligation.update({
          where: { id: o.id },
          data: { amountPaidMinor: newAmountPaid, status: newAmountPaid >= o.amountDueMinor ? "PAID" : "PARTIALLY_PAID" },
        });
      }
    }
  });

  await recordAudit({
    estateId: null,
    actorUserId: null,
    action: "tenant_management.payment.paystack_completed",
    entityType: "RentPayment",
    entityId: payment.id,
    after: { paymentId: payment.id },
  });

  return { status: "completed" as const };
}

/**
 * The only place a Tenant Management Paystack payment is ever finalized
 * via webhook. Idempotent two ways: the PaystackWebhookEvent row dedupes
 * retried deliveries of the exact same (reference, event) pair, and
 * applyPaystackChargeSuccess()'s own status check makes re-processing a
 * safe no-op regardless.
 */
export async function handleTenantPaystackWebhook(eventType: string, reference: string) {
  const alreadyProcessed = await prisma.paystackWebhookEvent
    .create({ data: { reference, eventType } })
    .then(() => false)
    .catch(() => true); // unique constraint violation = duplicate delivery
  if (alreadyProcessed) return { status: "duplicate" as const };

  const payment = await prisma.rentPayment.findUnique({ where: { gatewayReference: reference }, include: { allocations: true } });
  if (!payment) return { status: "unknown_reference" as const };

  if (eventType === "charge.success") return applyPaystackChargeSuccess(payment);

  if (eventType === "charge.failed") {
    if (payment.status === "COMPLETED") return { status: "already_completed" as const };
    await prisma.rentPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { status: "failed" as const };
  }

  return { status: "ignored" as const };
}

/**
 * Server-side verification fallback for the browser's post-checkout
 * redirect — called from the tenant-facing callback page so a payment
 * shows as confirmed even if the webhook is delayed, but the redirect
 * itself is still never trusted: this calls Paystack's own /verify
 * endpoint and only applies the result if Paystack itself reports success.
 */
export async function verifyTenantPaystackTransaction(reference: string) {
  if (!isPaystackConfigured()) throw new PaystackNotConfiguredError();

  const payment = await prisma.rentPayment.findUnique({ where: { gatewayReference: reference }, include: { allocations: true } });
  if (!payment) return { status: "unknown_reference" as const };
  if (payment.status === "COMPLETED") return { status: "already_completed" as const };

  const secretKey = process.env.PAYSTACK_SECRET_KEY!;
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = await response.json();

  if (response.ok && body.status && body.data?.status === "success") {
    return applyPaystackChargeSuccess(payment);
  }
  return { status: "not_yet_successful" as const };
}

/** Abandoned-checkout sweep — a PENDING payment whose Paystack session has gone stale (tenant closed the tab, never completed checkout) is marked ABANDONED so it stops showing as "in progress" forever. Safe to call repeatedly; only touches rows still PENDING past the cutoff. */
export async function markAbandonedPendingPayments(olderThanMinutes = 60) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  const result = await prisma.rentPayment.updateMany({
    where: { status: "PENDING", method: "ONLINE_PAYMENT", createdAt: { lt: cutoff } },
    data: { status: "ABANDONED" },
  });
  return { abandoned: result.count };
}
