"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { updatePayoutDetailsAction, type ActionState } from "../dashboard/tenants/actions";

const initialState: ActionState = {};

/** Bank details are masked until the landlord explicitly asks to edit them — see property.ts's getPayoutDetails/updatePayoutDetails for the server-side access control that backs this. */
export function PayoutDetailsForm({
  ownerId,
  current,
}: {
  ownerId: string;
  current: { payoutBankName: string | null; payoutAccountNumber: string | null; payoutAccountName: string | null };
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updatePayoutDetailsAction, initialState);

  // A successful save collapses back to the masked view — without this,
  // the form would just sit there post-submit with no visible
  // confirmation that anything happened (revalidatePath refreshes the
  // server-rendered `current` prop, but this component stays mounted with
  // its own uncontrolled inputs, so nothing else would ever flip it back).
  // Adjusting state during render (React's documented pattern for
  // reacting to a prop/state change) rather than in an effect, since
  // setState-in-effect would trigger an extra, unnecessary render pass.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (!state.error) setEditing(false);
  }

  if (!editing) {
    return (
      <div>
        {current.payoutBankName ? (
          <div className="text-sm">
            <p className="font-medium">{current.payoutBankName}</p>
            <p className="text-foreground-muted">
              {current.payoutAccountName} · •••• {current.payoutAccountNumber?.slice(-4)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">No payout details on file yet.</p>
        )}
        <Button type="button" variant="secondary" className="mt-3" onClick={() => setEditing(true)}>
          {current.payoutBankName ? "Update Bank Details" : "Add Bank Details"}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <input type="hidden" name="ownerId" value={ownerId} />
      <div>
        <Label htmlFor="bankName">Bank name</Label>
        <Input id="bankName" name="payoutBankName" defaultValue={current.payoutBankName ?? ""} required />
      </div>
      <div>
        <Label htmlFor="accountNumber">Account number</Label>
        <Input id="accountNumber" name="payoutAccountNumber" defaultValue={current.payoutAccountNumber ?? ""} required />
      </div>
      <div>
        <Label htmlFor="accountName">Account name</Label>
        <Input id="accountName" name="payoutAccountName" defaultValue={current.payoutAccountName ?? ""} required />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Bank Details"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
