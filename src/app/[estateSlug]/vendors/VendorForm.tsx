"use client";

import { useActionState } from "react";
import { Button, Checkbox, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { createVendorPageAction, type VendorFormState } from "./actions";

const CATEGORIES = [
  "ELECTRICITY",
  "GENERATOR",
  "PLUMBING",
  "WATER",
  "SECURITY",
  "ROADS",
  "DRAINAGE",
  "WASTE",
  "LANDSCAPING",
  "BUILDING",
  "OTHER",
] as const;

const initialState: VendorFormState = {};

export function VendorForm({ estateSlug }: { estateSlug: string }) {
  const action = createVendorPageAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Vendor name</Label>
          <Input id="name" name="name" required maxLength={160} />
        </div>
        <div>
          <Label htmlFor="contactName">Contact name</Label>
          <Input id="contactName" name="contactName" maxLength={120} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" maxLength={30} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue="">
            <option value="">No category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="contractStartDate">Contract start</Label>
          <Input id="contractStartDate" name="contractStartDate" type="date" />
        </div>
        <div>
          <Label htmlFor="contractEndDate">Contract end</Label>
          <Input id="contractEndDate" name="contractEndDate" type="date" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
        </div>
        <div className="col-span-2">
          <Checkbox name="isApproved" label="Approved vendor" defaultChecked />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add vendor"}
      </Button>
    </form>
  );
}
