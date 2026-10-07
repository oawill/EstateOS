"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { HOUSEHOLD_RELATIONSHIP_LABELS } from "@/server/modules/household/labels";
import { addHouseholdMemberAction, type HouseholdFormState } from "./actions";

const initialState: HouseholdFormState = {};

export function HouseholdForm({ estateSlug }: { estateSlug: string }) {
  const [state, formAction, pending] = useActionState(addHouseholdMemberAction.bind(null, estateSlug), initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      {state.saved && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Person added.</p>}
      <div>
        <Label htmlFor="hh-name">Full name</Label>
        <Input id="hh-name" name="fullName" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="hh-rel">Relationship</Label>
          <Select id="hh-rel" name="relationship" defaultValue="SPOUSE">
            {Object.entries(HOUSEHOLD_RELATIONSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="hh-phone">Phone (optional)</Label>
          <Input id="hh-phone" name="phone" type="tel" />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Adding…" : "Add person"}
      </Button>
    </form>
  );
}
