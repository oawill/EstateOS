"use client";

import { useActionState } from "react";
import type { Plan } from "@prisma/client";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { addSubscriptionAction, type AddSubscriptionFormState } from "../actions";

const MODULES = [
  ["ESTATE_MANAGEMENT", "Estate Management"],
  ["TENANT_MANAGEMENT", "Tenant Management"],
  ["SHORTLET_MANAGEMENT", "Shortlet Management"],
] as const;

const initialState: AddSubscriptionFormState = {};

export function AddSubscriptionForm({ organizationId, plans }: { organizationId: string; plans: Plan[] }) {
  const action = addSubscriptionAction.bind(null, organizationId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <h3 className="text-sm font-medium">Add a subscription</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="module">Module</Label>
          <Select id="module" name="module" required defaultValue="ESTATE_MANAGEMENT">
            {MODULES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="planId">Plan</Label>
          <Select id="planId" name="planId" defaultValue="">
            <option value="">No plan / custom pricing</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} ({plan.module.replaceAll("_", " ")})
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="quantity">Quantity (units)</Label>
          <Input id="quantity" name="quantity" type="number" min="1" placeholder="200" />
        </div>
        <div>
          <Label htmlFor="monthlyPriceNaira">Price (₦/mo)</Label>
          <Input id="monthlyPriceNaira" name="monthlyPriceNaira" type="number" min="0" step="0.01" placeholder="Custom price" />
        </div>
        <div>
          <Label htmlFor="trialEndsAt">Trial ends</Label>
          <Input id="trialEndsAt" name="trialEndsAt" type="date" />
        </div>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding…" : "Add subscription"}
      </Button>
    </form>
  );
}
