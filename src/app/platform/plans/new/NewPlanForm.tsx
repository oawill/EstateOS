"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { createPlanAction, type CreatePlanFormState } from "../actions";

const initialState: CreatePlanFormState = {};

export function NewPlanForm() {
  const [state, formAction, pending] = useActionState(createPlanAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="name">Plan name</Label>
        <Input id="name" name="name" required placeholder="Starter" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="monthlyPriceNaira">Monthly price (₦)</Label>
          <Input id="monthlyPriceNaira" name="monthlyPriceNaira" type="number" min="1" step="1" required />
        </div>
        <div>
          <Label htmlFor="annualPriceNaira">Annual price (₦)</Label>
          <Input id="annualPriceNaira" name="annualPriceNaira" type="number" min="1" step="1" />
        </div>
      </div>
      <div>
        <Label htmlFor="unitLimit">Unit limit</Label>
        <Input id="unitLimit" name="unitLimit" type="number" min="1" step="1" placeholder="Leave blank for unlimited" />
      </div>
      <div>
        <Label htmlFor="featureSummary">What&apos;s included</Label>
        <Input id="featureSummary" name="featureSummary" placeholder="Up to 50 units, all modules" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Create plan"}
      </Button>
    </form>
  );
}
