"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { createOwnerProfileAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export function OwnerOnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(createOwnerProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={defaultName} required />
      </div>
      <div>
        <Label htmlFor="countryOfResidence">Country of residence</Label>
        <Input id="countryOfResidence" name="countryOfResidence" placeholder="Nigeria" />
      </div>
      <div>
        <Label htmlFor="whatsapp">WhatsApp number</Label>
        <Input id="whatsapp" name="whatsapp" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create Landlord Profile"}
      </Button>
    </form>
  );
}
