"use client";

import { useActionState, useState } from "react";
import { Badge, Button, Card, FormError, Input, Label } from "@/components/shared/ui";
import { formatDate, formatNaira } from "@/lib/utils";
import { INVOICE_STATUS_TONE as STATUS_TONE } from "@/lib/statusTones";
import { payWithPaystackAction, recordManualPaymentAction, type PayWithPaystackFormState, type RecordManualPaymentFormState } from "./actions";

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  title: string;
  amountKobo: number;
  dueDate: string;
  status: keyof typeof STATUS_TONE;
  receiptNumber?: string;
}

const payInitial: PayWithPaystackFormState = {};
const manualInitial: RecordManualPaymentFormState = {};

export function InvoiceCard({ estateSlug, invoice }: { estateSlug: string; invoice: InvoiceSummary }) {
  const [showManualForm, setShowManualForm] = useState(false);
  const payAction = payWithPaystackAction.bind(null, estateSlug);
  const [payState, payFormAction, payPending] = useActionState(payAction, payInitial);
  const manualAction = recordManualPaymentAction.bind(null, estateSlug);
  const [manualState, manualFormAction, manualPending] = useActionState(manualAction, manualInitial);

  const isSettled = invoice.status === "PAID" || invoice.status === "CANCELLED";

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{invoice.title}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{formatNaira(invoice.amountKobo)}</p>
          <p className="mt-0.5 text-sm text-foreground-muted">
            {invoice.invoiceNumber} · Due {formatDate(invoice.dueDate)}
          </p>
          {invoice.receiptNumber && <p className="mt-1 text-xs text-foreground-muted">Receipt {invoice.receiptNumber}</p>}
        </div>
        <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status.replaceAll("_", " ")}</Badge>
      </div>

      {!isSettled && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <FormError message={payState.error} />
          <div className="flex flex-wrap gap-2">
            <form action={payFormAction}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <Button type="submit" disabled={payPending}>
                {payPending ? "Redirecting…" : "Pay with card / bank transfer"}
              </Button>
            </form>
            <Button type="button" variant="secondary" onClick={() => setShowManualForm((v) => !v)}>
              I&apos;ve already paid by transfer
            </Button>
          </div>

          {showManualForm && (
            <form action={manualFormAction} className="space-y-3 rounded-lg bg-surface-muted p-4">
              <FormError message={manualState.error} />
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <div>
                <Label htmlFor={`amount-${invoice.id}`}>Amount paid (₦)</Label>
                <Input
                  id={`amount-${invoice.id}`}
                  name="amountNaira"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={(invoice.amountKobo / 100).toString()}
                />
              </div>
              <div>
                <Label htmlFor={`note-${invoice.id}`}>Transfer reference / note</Label>
                <Input id={`note-${invoice.id}`} name="note" placeholder="e.g. GTB transfer, 25 Aug" />
              </div>
              <Button type="submit" disabled={manualPending}>
                {manualPending ? "Submitting…" : "Submit for approval"}
              </Button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
