"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { assignPlanAction, type AssignPlanFormState } from "../../actions";

interface PlanOption {
  id: string;
  name: string;
}

const initialState: AssignPlanFormState = {};

export function AssignPlanForm({
  estateId,
  currentPlanId,
  currentTrialEndsAt,
  plans,
}: {
  estateId: string;
  currentPlanId: string | null;
  currentTrialEndsAt: Date | null;
  plans: PlanOption[];
}) {
  const action = assignPlanAction.bind(null, estateId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const trialDefault = currentTrialEndsAt ? new Date(currentTrialEndsAt).toISOString().slice(0, 10) : "";

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="planId">Plan</Label>
        <Select id="planId" name="planId" defaultValue={currentPlanId ?? ""}>
          <option value="">No plan (unlimited)</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="trialEndsAt">Trial ends</Label>
        <Input id="trialEndsAt" name="trialEndsAt" type="date" defaultValue={trialDefault} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
