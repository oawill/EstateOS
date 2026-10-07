"use client";

import { useActionState } from "react";
import { Button, Card, FormError, Input, Label } from "@/components/shared/ui";
import { setThresholdAction, type ThresholdState } from "../../approvals/actions";

const initialState: ThresholdState = {};

export function ApprovalLimitForm({ propertyId, currentNaira }: { propertyId: string; currentNaira: string }) {
  const [state, formAction, pending] = useActionState(setThresholdAction.bind(null, propertyId), initialState);

  return (
    <Card>
      <p className="text-sm font-medium">Spending approval limit</p>
      <p className="mt-1 text-xs text-foreground-muted">
        Maintenance costs above this amount wait for your approval before they&apos;re recorded as paid. Leave blank to not be asked.
      </p>
      <form action={formAction} className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="limit">Ask me above (₦)</Label>
          <Input id="limit" name="thresholdNaira" type="number" min={0} step="1" defaultValue={currentNaira} placeholder="e.g. 100000" />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
      <FormError message={state.error} />
      {state.saved && <p className="mt-2 text-xs text-success">Saved.</p>}
    </Card>
  );
}
