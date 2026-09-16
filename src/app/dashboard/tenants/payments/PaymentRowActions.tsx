"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input } from "@/components/shared/ui";
import { reversePaymentAction, waiveObligationAction, type ActionState } from "../actions";

const initialState: ActionState = {};

export function ReversePaymentControl({ paymentId }: { paymentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(reversePaymentAction, initialState);

  if (!open) {
    return (
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Reverse
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <FormError message={state.error} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <Input name="reason" placeholder="Reason for reversal" required className="sm:w-64" />
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Reversing…" : "Confirm Reversal"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function WaiveObligationControl({ obligationId }: { obligationId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(waiveObligationAction, initialState);

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Waive
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <FormError message={state.error} />
      <input type="hidden" name="obligationId" value={obligationId} />
      <Input name="reason" placeholder="Reason for waiver" required className="sm:w-64" />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Waiving…" : "Confirm Waiver"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
