"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { recordRentPaymentAction, type ActionState } from "../actions";

const initialState: ActionState = {};
const METHODS = ["BANK_TRANSFER", "CARD", "CASH", "POS", "ONLINE_PAYMENT", "OTHER"] as const;

export function PaymentForm({
  obligations,
}: {
  obligations: { id: string; tenantName: string; propertyName: string; unitLabel: string; outstandingMinor: number; dueDate: string }[];
}) {
  const [state, formAction, pending] = useActionState(recordRentPaymentAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="pay-obligation">Rent obligation</Label>
        <Select id="pay-obligation" name="obligationId" required defaultValue="">
          <option value="" disabled>
            Select an obligation
          </option>
          {obligations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.tenantName} · {o.propertyName} {o.unitLabel} · due {o.dueDate} · outstanding {(o.outstandingMinor / 100).toLocaleString()}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="pay-amount">Amount received (₦)</Label>
        <Input id="pay-amount" name="amountMinor" type="number" min={0} required />
      </div>
      <div>
        <Label htmlFor="pay-method">Method</Label>
        <Select id="pay-method" name="method" defaultValue="BANK_TRANSFER">
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="pay-ref">Transaction reference</Label>
        <Input id="pay-ref" name="transactionRef" />
      </div>
      <div>
        <Label htmlFor="pay-notes">Notes</Label>
        <Textarea id="pay-notes" name="notes" rows={2} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Recording…" : "Record Payment"}
      </Button>
    </form>
  );
}
