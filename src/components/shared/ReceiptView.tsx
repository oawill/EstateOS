import { Card, Badge } from "@/components/shared/ui";
import { formatNaira, formatDate } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

interface ReceiptPayment {
  id: string;
  referenceNumber: string;
  amountMinor: number;
  paidAt: Date;
  method: string;
  transactionRef: string | null;
  status: string;
  tenant: { fullName: string };
  lease: { unit: { label: string; property: { name: string; addressLine: string; city: string } } };
  receipt: { receiptNumber: string; createdAt: Date } | null;
  allocations: {
    amountMinor: number;
    rentObligation: { periodStart: Date; periodEnd: Date; amountDueMinor: number; amountPaidMinor: number } | null;
    charge: { type: string; description: string } | null;
  }[];
}

/** The one place a NidraQ rent receipt is ever rendered — used by both the tenant portal and the landlord/manager dashboard so the two never drift into different layouts. */
export function ReceiptView({ payment }: { payment: ReceiptPayment }) {
  return (
    <Card className="mx-auto max-w-lg print:shadow-none print:border-none">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold tracking-tight">{BRAND.name}</p>
          <p className="text-xs text-foreground-muted">Rent Receipt</p>
        </div>
        {payment.receipt && <p className="font-mono text-sm font-medium">{payment.receipt.receiptNumber}</p>}
      </div>

      {payment.status === "REVERSED" && (
        <div className="mt-4">
          <Badge tone="danger">This payment has been reversed</Badge>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-foreground-muted">Tenant</p>
          <p className="font-medium">{payment.tenant.fullName}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Property / Unit</p>
          <p className="font-medium">
            {payment.lease.unit.property.name} · {payment.lease.unit.label}
          </p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Payment Date</p>
          <p className="font-medium">{formatDate(payment.paidAt)}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Payment Method</p>
          <p className="font-medium">{payment.method.replaceAll("_", " ")}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Payment Reference</p>
          <p className="font-mono font-medium">{payment.transactionRef ?? payment.referenceNumber}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-muted">Amount Paid</p>
          <p className="font-medium">{formatNaira(payment.amountMinor)}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Allocation</p>
        <ul className="mt-2 space-y-2 text-sm">
          {payment.allocations.map((a, i) => (
            <li key={i} className="flex items-center justify-between">
              <span className="text-foreground-muted">
                {a.rentObligation
                  ? `Rent (${formatDate(a.rentObligation.periodStart)} – ${formatDate(a.rentObligation.periodEnd)})`
                  : a.charge
                    ? `${a.charge.type.replaceAll("_", " ")} — ${a.charge.description}`
                    : "Account credit (unapplied balance)"}
              </span>
              <span className="font-medium">{formatNaira(a.amountMinor)}</span>
            </li>
          ))}
        </ul>
      </div>

      {payment.allocations.some((a) => a.rentObligation) && (
        <div className="mt-4 border-t border-border pt-4 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Remaining Balance</p>
          {payment.allocations
            .filter((a) => a.rentObligation)
            .map((a, i) => {
              const o = a.rentObligation!;
              const remaining = o.amountDueMinor - o.amountPaidMinor;
              return (
                <p key={i} className="mt-1">
                  {remaining > 0 ? `${formatNaira(remaining)} still outstanding on this rent period` : "This rent period is now fully paid"}
                </p>
              );
            })}
        </div>
      )}
    </Card>
  );
}
