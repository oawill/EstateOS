"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { startRentPaymentAction, type PayRentActionState } from "./actions";

const initialState: PayRentActionState = {};

/**
 * Tenant selects the obligation, reviews the amount, chooses how much to
 * pay (supports paying less than the full amount, i.e. an intentional
 * partial payment), then is redirected to Paystack — the payment only
 * ever counts once the webhook confirms it server-side.
 */
export function PayRentForm({ obligationId, outstandingMinor }: { obligationId: string; outstandingMinor: number }) {
  const [state, formAction, pending] = useActionState(startRentPaymentAction, initialState);
  const [amount, setAmount] = useState(String(outstandingMinor / 100));

  useEffect(() => {
    if (state.authorizationUrl) window.location.href = state.authorizationUrl;
  }, [state.authorizationUrl]);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <input type="hidden" name="obligationId" value={obligationId} />
      <div>
        <Label htmlFor="pay-amount">Amount to pay (₦)</Label>
        <Input
          id="pay-amount"
          name="amountMinorDisplay"
          type="number"
          min={1}
          max={outstandingMinor / 100}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input type="hidden" name="amountMinor" value={Math.round(Number(amount || 0) * 100)} />
      </div>
      <Button type="submit" className="w-full" disabled={pending || state.authorizationUrl != null}>
        {pending || state.authorizationUrl ? "Redirecting to payment…" : "Pay Now"}
      </Button>
    </form>
  );
}
