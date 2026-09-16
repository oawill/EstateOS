"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { markLeaseNoticeAction, renewLeaseAction, type ActionState } from "../actions";

const initialState: ActionState = {};
const RENT_FREQUENCIES = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"] as const;

export function NoticeButton({ leaseId }: { leaseId: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => markLeaseNoticeAction(leaseId)}
    >
      Record Tenant Notice
    </Button>
  );
}

export function RenewLeaseForm({
  leaseId,
  currentRentMinor,
  currentFrequency,
}: {
  leaseId: string;
  currentRentMinor: number;
  currentFrequency: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(renewLeaseAction, initialState);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Renew Lease
      </Button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg border border-border p-4">
      <FormError message={state.error} />
      <input type="hidden" name="previousLeaseId" value={leaseId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`r-start-${leaseId}`}>New start date</Label>
          <Input id={`r-start-${leaseId}`} name="startDate" type="date" required />
        </div>
        <div>
          <Label htmlFor={`r-end-${leaseId}`}>New end date</Label>
          <Input id={`r-end-${leaseId}`} name="endDate" type="date" required />
        </div>
      </div>
      <div>
        <Label htmlFor={`r-rent-${leaseId}`}>New rent amount (₦)</Label>
        <Input id={`r-rent-${leaseId}`} name="rentAmountMinor" type="number" min={0} required defaultValue={currentRentMinor / 100} />
      </div>
      <div>
        <Label htmlFor={`r-freq-${leaseId}`}>Payment frequency</Label>
        <Select id={`r-freq-${leaseId}`} name="paymentFrequency" defaultValue={currentFrequency}>
          {RENT_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Renewing…" : "Confirm Renewal"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
