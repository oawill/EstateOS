"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { recordBookingPaymentAction, cancelBookingAction, type ActionState } from "../../actions";

const initialState: ActionState = {};
const METHODS = ["BANK_TRANSFER", "CARD", "CASH", "POS", "ONLINE_PAYMENT", "CHEQUE", "OTHER"] as const;

export function RecordPaymentForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(recordBookingPaymentAction, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <FormError message={state.error} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <div>
        <Label htmlFor="pay-amount">Amount (₦)</Label>
        <Input id="pay-amount" name="amountMinor" type="number" min={0} required className="w-32" />
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
        <Label htmlFor="pay-ref">Reference</Label>
        <Input id="pay-ref" name="transactionRef" className="w-40" />
      </div>
      <Button type="submit" disabled={pending}>
        Record Payment
      </Button>
    </form>
  );
}

export function CancelBookingForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState(cancelBookingAction, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <FormError message={state.error} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="flex-1">
        <Label htmlFor="cancel-reason">Cancellation reason</Label>
        <Textarea id="cancel-reason" name="reason" rows={1} required />
      </div>
      <Button type="submit" variant="danger" disabled={pending}>
        Cancel Booking
      </Button>
    </form>
  );
}
