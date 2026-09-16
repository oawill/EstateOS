import { prisma } from "@/server/db/client";
import { NotFoundError } from "@/lib/errors";
import { PROPERTY_OWNER_SAFE_SELECT, assertPropertyAccess } from "./access";
import type { CurrentUser } from "@/server/auth/session";

/** Everything a rent receipt needs to render — the tenant, property/unit, the payment itself, its allocation breakdown, and the remaining balance on whatever it was allocated against. Receipts are immutable once issued; nothing here is ever recomputed after the fact except by a reversal, which is its own separate ledger entry. */
async function loadReceipt(paymentId: string) {
  const payment = await prisma.rentPayment.findUnique({
    where: { id: paymentId },
    include: {
      tenant: true,
      lease: { include: { unit: { include: { property: { include: { owner: { select: PROPERTY_OWNER_SAFE_SELECT } } } } } } },
      receipt: true,
      allocations: { include: { rentObligation: true, charge: true } },
    },
  });
  if (!payment || !payment.receipt) throw new NotFoundError("Receipt");
  return payment;
}

export async function getReceiptForTenant(tenantId: string, paymentId: string) {
  const payment = await loadReceipt(paymentId);
  if (payment.tenantId !== tenantId) throw new NotFoundError("Receipt");
  return payment;
}

export async function getReceiptForLandlord(actor: CurrentUser, paymentId: string) {
  const payment = await loadReceipt(paymentId);
  await assertPropertyAccess(actor, payment.lease.unit.propertyId);
  return payment;
}
