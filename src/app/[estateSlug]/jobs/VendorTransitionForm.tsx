"use client";

import { useActionState } from "react";
import { Button, FormError, Label, Select } from "@/components/shared/ui";
import { transitionAssignedTicketAction, type VendorTransitionFormState } from "./actions";

const STATUSES = ["ASSIGNED", "IN_PROGRESS", "RESOLVED"] as const;

const initialState: VendorTransitionFormState = {};

export function VendorTransitionForm({
  estateSlug,
  ticketId,
  currentStatus,
}: {
  estateSlug: string;
  ticketId: string;
  currentStatus: string;
}) {
  const action = transitionAssignedTicketAction.bind(null, estateSlug, ticketId);
  const [state, formAction, pending] = useActionState(action, initialState);

  const defaultStatus = STATUSES.includes(currentStatus as (typeof STATUSES)[number])
    ? currentStatus
    : "ASSIGNED";

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="status">Update status</Label>
        <Select id="status" name="status" required defaultValue={defaultStatus}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="note">Note (visible to the resident)</Label>
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder="What did you do?"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save update"}
      </Button>
    </form>
  );
}
