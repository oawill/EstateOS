"use client";

import { useActionState } from "react";
import { Button, FormError, Label, Select } from "@/components/shared/ui";
import { transitionTicketAction, type TransitionTicketFormState } from "./actions";

const STATUSES = ["REPORTED", "REVIEWED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

interface StaffOption {
  userId: string;
  name: string;
  role: string;
}

interface VendorOption {
  id: string;
  name: string;
}

const initialState: TransitionTicketFormState = {};

export function TransitionForm({
  estateSlug,
  ticketId,
  currentStatus,
  staff,
  vendors,
}: {
  estateSlug: string;
  ticketId: string;
  currentStatus: string;
  staff: StaffOption[];
  vendors: VendorOption[];
}) {
  const action = transitionTicketAction.bind(null, estateSlug, ticketId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="status">Update status</Label>
        <Select id="status" name="status" required defaultValue={currentStatus}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="assignedToUserId">Assign to</Label>
          <Select id="assignedToUserId" name="assignedToUserId" defaultValue="">
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name} ({s.role.replaceAll("_", " ")})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="vendorId">Vendor (record only)</Label>
          <Select id="vendorId" name="vendorId" defaultValue="">
            <option value="">None</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="note">Note (visible to the resident)</Label>
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder="What's happening with this ticket?"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save update"}
      </Button>
    </form>
  );
}
