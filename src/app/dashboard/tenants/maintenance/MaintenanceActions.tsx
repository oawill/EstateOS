"use client";

import { useActionState, useState } from "react";
import type { RentalMaintenanceStatus } from "@prisma/client";
import { Button, FormError, Input, Label, Textarea, Checkbox } from "@/components/shared/ui";
import { updateMaintenanceStatusAction, recordMaintenanceExpenseAction, type ActionState } from "../actions";

const initialState: ActionState = {};
const STATUS_FLOW: RentalMaintenanceStatus[] = ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "WAITING", "COMPLETED", "CLOSED"];

export function StatusControls({ requestId, status }: { requestId: string; status: RentalMaintenanceStatus }) {
  const currentIndex = STATUS_FLOW.indexOf(status);
  const next = STATUS_FLOW[currentIndex + 1];
  if (!next) return null;

  return (
    <Button type="button" variant="secondary" onClick={() => updateMaintenanceStatusAction(requestId, next)}>
      Mark {next.replaceAll("_", " ")}
    </Button>
  );
}

export function ExpenseForm({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(recordMaintenanceExpenseAction, initialState);

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Record Expense
      </Button>
    );
  }

  return (
    <form action={formAction} className="mt-3 w-full space-y-3 rounded-lg border border-border p-4">
      <FormError message={state.error} />
      <input type="hidden" name="requestId" value={requestId} />
      <div>
        <Label htmlFor={`ex-vendor-${requestId}`}>Vendor name</Label>
        <Input id={`ex-vendor-${requestId}`} name="vendorName" required />
      </div>
      <div>
        <Label htmlFor={`ex-desc-${requestId}`}>Work description</Label>
        <Textarea id={`ex-desc-${requestId}`} name="description" rows={2} required />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor={`ex-est-${requestId}`}>Estimate (₦)</Label>
          <Input id={`ex-est-${requestId}`} name="estimateMinor" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor={`ex-app-${requestId}`}>Approved (₦)</Label>
          <Input id={`ex-app-${requestId}`} name="approvedAmountMinor" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor={`ex-final-${requestId}`}>Final (₦)</Label>
          <Input id={`ex-final-${requestId}`} name="finalAmountMinor" type="number" min={0} />
        </div>
      </div>
      <Checkbox name="isPaid" label="Paid" />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Expense"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
