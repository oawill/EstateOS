import Link from "next/link";
import { Card, Badge, Button, Input, Label } from "@/components/shared/ui";
import { guardPage } from "@/server/auth/pageGuard";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedPropertyIds } from "@/server/modules/tenantManagement/access";
import { listOutstandingObligations, getArrears, listAccessiblePayments } from "@/server/modules/tenantManagement/payments";
import { listAccessibleTenants } from "@/server/modules/tenantManagement/tenant";
import { listAccessibleCharges } from "@/server/modules/tenantManagement/charges";
import { formatNaira, formatDate } from "@/lib/utils";
import { MultiAllocationPaymentForm, type PayableTenant } from "./MultiAllocationPaymentForm";
import { ReversePaymentControl, WaiveObligationControl } from "./PaymentRowActions";

const BUCKET_TONES = { "1-30": "warning", "31-60": "warning", "61-90": "danger", "90+": "danger" } as const;

export default async function PaymentsAndArrearsPage({
  searchParams,
}: {
  searchParams: Promise<{ minAgeDays?: string; minAmount?: string }>;
}) {
  const user = await guardPage(() => requireUser());
  const propertyIds = await getAuthorizedPropertyIds(user);
  const { minAgeDays, minAmount } = await searchParams;

  const [obligations, arrears, recentPayments, tenants, charges] = await Promise.all([
    listOutstandingObligations(propertyIds),
    getArrears(propertyIds, {
      minAgeDays: minAgeDays ? Number(minAgeDays) : undefined,
      minAmountMinor: minAmount ? Math.round(Number(minAmount) * 100) : undefined,
    }),
    listAccessiblePayments(propertyIds),
    listAccessibleTenants(user),
    listAccessibleCharges(user),
  ]);

  // Builds the "who can I pay, and what do they owe" list the payment
  // form needs — one entry per tenant, combining their outstanding rent
  // obligations and unpaid charges into a single set of payable lines.
  const payableByTenant = new Map<string, PayableTenant>();
  for (const t of tenants) {
    payableByTenant.set(t.id, {
      tenantId: t.id,
      tenantName: t.fullName,
      leaseId: t.leases[0]?.id ?? null,
      propertyLabel: t.unit ? `${t.unit.property.name} · ${t.unit.label}` : "No unit",
      lines: [],
    });
  }
  for (const o of obligations) {
    const entry = payableByTenant.get(o.lease.tenantId);
    if (!entry) continue;
    entry.leaseId = o.leaseId; // the lease that actually has something owed takes priority over the fallback
    entry.lines.push({
      key: `obligation:${o.id}`,
      rentObligationId: o.id,
      label: `Rent (${formatDate(o.periodStart)} – ${formatDate(o.periodEnd)})`,
      dueDate: formatDate(o.dueDate),
      outstandingMinor: o.amountDueMinor - o.amountPaidMinor,
    });
  }
  for (const c of charges) {
    if (c.status !== "PENDING" && c.status !== "PARTIALLY_PAID") continue;
    const entry = payableByTenant.get(c.tenantId);
    if (!entry) continue;
    entry.lines.push({
      key: `charge:${c.id}`,
      chargeId: c.id,
      label: `${c.type.replaceAll("_", " ")} — ${c.description}`,
      dueDate: formatDate(c.dueDate),
      outstandingMinor: c.amountMinor - c.amountPaidMinor,
    });
  }
  // A tenant with no lease at all has nowhere to attach a Payment record
  // (RentPayment.leaseId is required) — exclude them rather than let the
  // form submit an invalid reference.
  const payableTenants = Array.from(payableByTenant.values()).filter((t) => t.leaseId !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Rent &amp; Arrears</h1>
        <Link href="/api/tenant-management/export/arrears" className="text-sm font-medium text-primary hover:underline">
          Export Arrears (CSV)
        </Link>
      </div>

      <Card>
        <h2 className="text-sm font-medium">Record a payment</h2>
        <p className="mt-1 text-xs text-foreground-muted">
          Supports partial payments and a single payment covering both rent and other charges — outstanding balances update automatically.
        </p>
        <div className="mt-3">
          <MultiAllocationPaymentForm tenants={payableTenants} />
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Arrears</h2>

        <Card className="mt-3">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="minAgeDays">Minimum days overdue</Label>
              <Input id="minAgeDays" name="minAgeDays" type="number" min={0} defaultValue={minAgeDays ?? ""} className="w-32" />
            </div>
            <div>
              <Label htmlFor="minAmount">Minimum outstanding (₦)</Label>
              <Input id="minAmount" name="minAmount" type="number" min={0} defaultValue={minAmount ?? ""} className="w-40" />
            </div>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            {(minAgeDays || minAmount) && (
              <Link href="/dashboard/tenants/payments">
                <Button type="button" variant="secondary">
                  Clear
                </Button>
              </Link>
            )}
          </form>
        </Card>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["1-30", "31-60", "61-90", "90+"] as const).map((bucket) => {
            const rows = arrears.grouped[bucket] ?? [];
            const total = rows.reduce((sum, r) => sum + r.outstandingMinor, 0);
            return (
              <Card key={bucket}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{bucket} days</p>
                  <Badge tone={BUCKET_TONES[bucket]}>{rows.length}</Badge>
                </div>
                <p className="mt-2 text-lg font-semibold">{formatNaira(total)}</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          {arrears.rows.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No overdue rent matches these filters.</p>
            </Card>
          )}
          {arrears.rows.map((row) => (
            <Card key={row.obligationId}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{row.tenant.fullName}</p>
                  <p className="text-sm text-foreground-muted">
                    {row.property.name} · {row.unit.label} · due {formatDate(row.originalDueDate)} · {row.daysOverdue} days overdue
                  </p>
                </div>
                <p className="font-semibold text-danger">{formatNaira(row.outstandingMinor)}</p>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <WaiveObligationControl obligationId={row.obligationId} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Recent Payments</h2>
        <div className="mt-3 space-y-3">
          {recentPayments.length === 0 && (
            <Card>
              <p className="text-sm text-foreground-muted">No payments recorded yet.</p>
            </Card>
          )}
          {recentPayments.map((payment) => (
            <Card key={payment.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {payment.tenant.fullName} · {payment.referenceNumber}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {payment.lease.unit.property.name} · {payment.lease.unit.label} · {formatDate(payment.paidAt)} ·{" "}
                    {payment.method.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    tone={
                      payment.status === "COMPLETED"
                        ? "success"
                        : payment.status === "REVERSED"
                          ? "danger"
                          : payment.status === "FAILED" || payment.status === "ABANDONED"
                            ? "neutral"
                            : "warning"
                    }
                  >
                    {payment.status}
                  </Badge>
                  <p className="font-semibold">{formatNaira(payment.amountMinor)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <Link href={`/dashboard/tenants/receipts/${payment.id}`} className="text-sm font-medium text-primary hover:underline">
                  View Receipt
                </Link>
                {payment.status === "COMPLETED" && <ReversePaymentControl paymentId={payment.id} />}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
