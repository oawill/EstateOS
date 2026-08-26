import Link from "next/link";
import { Badge, Button, Card } from "@/components/shared/ui";
import { KpiCard } from "@/components/shared/KpiCard";
import { requireEstatePermission } from "@/server/auth/guards";
import { guardPage } from "@/server/auth/pageGuard";
import { formatDate, formatNaira } from "@/lib/utils";
import { INVOICE_STATUS_TONE } from "@/lib/statusTones";
import { getFinanceSummary, listCharges, listInvoices, listPendingManualPayments } from "@/server/modules/billing/service";
import { approveManualPaymentAction, rejectManualPaymentAction } from "./actions";

export default async function BillingPage({ params }: { params: Promise<{ estateSlug: string }> }) {
  const { estateSlug } = await params;
  const { membership } = await guardPage(() => requireEstatePermission(estateSlug, "invoices:*"));

  const [summary, charges, invoices, pendingManualPayments] = await Promise.all([
    getFinanceSummary(membership.estateId),
    listCharges(membership.estateId),
    listInvoices(membership.estateId),
    listPendingManualPayments(membership.estateId),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Billing</h1>
        <Link href={`/${estateSlug}/billing/charges/new`}>
          <Button>Create charge</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KpiCard tone="success" label="Collected today" value={formatNaira(summary.collectionsTodayKobo)} />
        <KpiCard tone="success" label="Collected this month" value={formatNaira(summary.collectionsThisMonthKobo)} />
        <KpiCard tone="success" label="Collected this year" value={formatNaira(summary.collectionsThisYearKobo)} />
        <KpiCard tone="warning" label="Outstanding" value={formatNaira(summary.outstandingKobo)} />
        <KpiCard tone="danger" label="Overdue invoices" value={summary.overdueCount} />
      </div>

      {pendingManualPayments.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Pending bank transfer confirmations</h2>
          {pendingManualPayments.map((payment) => (
            <Card key={payment.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {payment.invoice.resident?.firstName} {payment.invoice.resident?.lastName} ·{" "}
                    {formatNaira(payment.amountKobo)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Invoice {payment.invoice.invoiceNumber} · {payment.invoice.unit.property.addressLabel}
                    {payment.note ? ` · "${payment.note}"` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await approveManualPaymentAction(estateSlug, payment.id);
                    }}
                  >
                    <Button type="submit">Approve</Button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await rejectManualPaymentAction(estateSlug, payment.id);
                    }}
                  >
                    <Button type="submit" variant="danger">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-medium">Charges</h2>
        {charges.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No charges yet.</p>
          </Card>
        ) : (
          charges.map((charge) => (
            <Card key={charge.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{charge.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatNaira(charge.amountKobo)} · Due {formatDate(charge.dueDate)}
                  </p>
                </div>
                <Badge>{charge._count.invoices} invoices</Badge>
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Invoices</h2>
        {invoices.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">No invoices yet — create a charge to generate them.</p>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {invoice.invoiceNumber} · {invoice.resident?.firstName} {invoice.resident?.lastName}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {invoice.unit.property.addressLabel} · {formatNaira(invoice.amountKobo)} · Due{" "}
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
                <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{invoice.status.replaceAll("_", " ")}</Badge>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
