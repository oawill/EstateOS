"use client";

import { useActionState, useState } from "react";
import { Badge, Button, Card, FormError, Input, Label } from "@/components/shared/ui";
import { formatDate, formatMoney } from "@/lib/utils";
import { INVOICE_STATUS_TONE as STATUS_TONE } from "@/lib/statusTones";
import {
  payWithPaystackAction,
  raiseDisputeAction,
  recordManualPaymentAction,
  type PayWithPaystackFormState,
  type RaiseDisputeFormState,
  type RecordManualPaymentFormState,
} from "./actions";

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
const disputeInitial: RaiseDisputeFormState = {};

export function InvoiceCard({
  estateSlug,
  invoice,
  currency = "NGN",
  locale = "en-NG",
}: {
  estateSlug: string;
  invoice: InvoiceSummary;
  currency?: string;
  locale?: string;
}) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const payAction = payWithPaystackAction.bind(null, estateSlug);
  const [payState, payFormAction, payPending] = useActionState(payAction, payInitial);
  const manualAction = recordManualPaymentAction.bind(null, estateSlug);
  const [manualState, manualFormAction, manualPending] = useActionState(manualAction, manualInitial);
  const disputeAction = raiseDisputeAction.bind(null, estateSlug);
  const [disputeState, disputeFormAction, disputePending] = useActionState(disputeAction, disputeInitial);

  const isSettled = invoice.status === "PAID" || invoice.status === "CANCELLED";

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{invoice.title}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{formatMoney(invoice.amountKobo, currency, locale)}</p>
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
                <Label htmlFor={`amount-${invoice.id}`}>Amount paid ({currency})</Label>
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

      <div className="mt-3 border-t border-border pt-3">
        {disputeState.success ? (
          <p className="text-sm text-success">Thanks — your question has been sent to the estate finance team.</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowDisputeForm((v) => !v)}
              className="text-xs font-medium text-foreground-muted hover:text-foreground hover:underline"
            >
              Question this charge
            </button>
            {showDisputeForm && (
              <form action={disputeFormAction} className="mt-3 space-y-3 rounded-lg bg-surface-muted p-4">
                <FormError message={disputeState.error} />
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <div>
                  <Label htmlFor={`reason-${invoice.id}`}>What&apos;s wrong with this charge?</Label>
                  <Input id={`reason-${invoice.id}`} name="reason" placeholder="e.g. I already moved out in June" required />
                </div>
                <Button type="submit" variant="secondary" disabled={disputePending}>
                  {disputePending ? "Sending…" : "Send to Finance"}
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
