"use client";

import { useActionState } from "react";
import { Button, Card, FormError, Label, Select, Textarea } from "@/components/shared/ui";
import { transitionDisputeAction, type TransitionDisputeFormState } from "../../actions";

const initial: TransitionDisputeFormState = {};

export function DisputeResolutionForm({
  estateSlug,
  disputeId,
  currentStatus,
}: {
  estateSlug: string;
  disputeId: string;
  currentStatus: string;
}) {
  const action = transitionDisputeAction.bind(null, estateSlug, disputeId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <h2 className="font-medium">Resolve this dispute</h2>
        <FormError message={state.error} />

        <div>
          <Label htmlFor="status">New status</Label>
          <Select id="status" name="status" defaultValue={currentStatus === "OPEN" ? "UNDER_REVIEW" : currentStatus}>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="RESOLVED">Resolved — charge stands</option>
            <option value="ADJUSTED">Adjusted — charge was changed</option>
            <option value="REJECTED">Rejected — no change warranted</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="resolutionNote">Resolution note (required to close)</Label>
          <Textarea id="resolutionNote" name="resolutionNote" rows={3} placeholder="Explain what was found and any action taken." />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
    </Card>
  );
}
