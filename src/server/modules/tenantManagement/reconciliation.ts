import { prisma } from "@/server/db/client";

/**
 * A payments reconciliation view for finance/admin users. Without a live
 * Paystack account to diff against, "successful gateway transactions" is
 * simply every ONLINE_PAYMENT-method RentPayment already in our own
 * ledger — reconciliation here means categorizing what's actually in the
 * ledger (completed/pending/failed/abandoned/reversed) and flagging
 * anything that looks like a duplicate, rather than silently discarding
 * discrepancies. When a real gateway integration is live, this is the
 * natural place to also pull the provider's own transaction list and diff
 * it against RentPayment.gatewayReference.
 */
export async function getReconciliationView(propertyIds: string[] | "all") {
  const where = propertyIds === "all" ? undefined : { lease: { unit: { propertyId: { in: propertyIds } } } };

  const payments = await prisma.rentPayment.findMany({
    where,
    include: { tenant: true, lease: { include: { unit: { include: { property: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const byStatus = {
    completed: payments.filter((p) => p.status === "COMPLETED"),
    pending: payments.filter((p) => p.status === "PENDING"),
    failed: payments.filter((p) => p.status === "FAILED"),
    abandoned: payments.filter((p) => p.status === "ABANDONED"),
    reversed: payments.filter((p) => p.status === "REVERSED"),
  };

  // Flag possible duplicates: same tenant, same amount, same day, more
  // than one payment — most often a double-submit of a manual entry.
  // Never auto-merged or discarded — just surfaced for a human to review.
  const groups = new Map<string, typeof payments>();
  for (const p of payments) {
    if (p.status === "REVERSED") continue;
    const dayKey = p.paidAt.toISOString().slice(0, 10);
    const key = `${p.tenantId}:${p.amountMinor}:${dayKey}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const possibleDuplicates = Array.from(groups.values()).filter((g) => g.length > 1);

  return { byStatus, possibleDuplicates, total: payments.length };
}
