"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { ORGANIZATION_TYPE_OPTIONS } from "@/app/request-demo/labels";
import { createOrganizationAction, type OrganizationFormState } from "../actions";

const initialState: OrganizationFormState = {};

export function NewOrganizationForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="name">Organization name</Label>
        <Input id="name" name="name" required placeholder="ABC Property Management" />
      </div>
      <div>
        <Label htmlFor="organizationType">Organization type</Label>
        <Select id="organizationType" name="organizationType" required defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {ORGANIZATION_TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="primaryContactName">Primary contact</Label>
        <Input id="primaryContactName" name="primaryContactName" placeholder="Adaeze Okafor" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="contact@abcproperties.ng" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" placeholder="080..." />
        </div>
      </div>
      <div>
        <Label htmlFor="country">Country</Label>
        <Input id="country" name="country" placeholder="NG" defaultValue="NG" />
      </div>
      <div>
        <Label htmlFor="billingNotes">Billing notes (internal)</Label>
        <Textarea id="billingNotes" name="billingNotes" rows={3} placeholder="Commercial terms, invoicing contact, etc." />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
