"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { AD_CATEGORY_OPTIONS } from "@/server/modules/advertising/labels";
import { applyAsAdvertiserAction, type AdvertiserFormState } from "./actions";

const initialState: AdvertiserFormState = {};

export function ApplyForm() {
  const [state, formAction, pending] = useActionState(applyAsAdvertiserAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" required placeholder="ABC Cooling Services" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactName">Contact name</Label>
          <Input id="contactName" name="contactName" required />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {AD_CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" required />
        </div>
      </div>
      <div>
        <Label htmlFor="website">Website (optional)</Label>
        <Input id="website" name="website" placeholder="https://" />
      </div>
      <div>
        <Label htmlFor="description">Tell us about your business</Label>
        <Textarea id="description" name="description" rows={4} required placeholder="What you offer, and who you serve." />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
      <p className="text-xs text-foreground-muted">
        NidraQ reviews every advertiser application before campaigns can be created.
      </p>
    </form>
  );
}
