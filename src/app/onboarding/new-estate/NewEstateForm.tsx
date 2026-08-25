"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { createEstateAction, type CreateEstateFormState } from "./actions";

const initialState: CreateEstateFormState = {};

export function NewEstateForm() {
  const [state, formAction, pending] = useActionState(createEstateAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="name">Estate name</Label>
        <Input id="name" name="name" required placeholder="Greenview Gardens Estate" />
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="12 Admiralty Way, Lekki Phase 1" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" placeholder="Lagos" />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" placeholder="Lagos" />
        </div>
      </div>
      <div>
        <Label htmlFor="contactEmail">Estate contact email</Label>
        <Input id="contactEmail" name="contactEmail" type="email" placeholder="office@greenview.ng" />
      </div>
      <div>
        <Label htmlFor="contactPhone">Estate contact phone</Label>
        <Input id="contactPhone" name="contactPhone" placeholder="080..." />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating estate…" : "Create estate"}
      </Button>
    </form>
  );
}
