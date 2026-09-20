"use client";

import { useActionState } from "react";
import { Button, Checkbox, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { CAMPAIGN_GOAL_OPTIONS } from "@/server/modules/advertising/labels";
import { createCampaignAction, type CreateCampaignFormState } from "../../actions";

const initialState: CreateCampaignFormState = {};

export function CreateCampaignForm({ estates }: { estates: { id: string; name: string; city: string | null }[] }) {
  const [state, formAction, pending] = useActionState(createCampaignAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="goal">Campaign goal</Label>
        <Select id="goal" name="goal" required defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {CAMPAIGN_GOAL_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="headline">Headline</Label>
        <Input id="headline" name="headline" required placeholder="20% Off AC Servicing" />
      </div>
      <div>
        <Label htmlFor="body">Description</Label>
        <Textarea id="body" name="body" required rows={3} placeholder="Keep your home cool this season." />
      </div>
      <div>
        <Label htmlFor="ctaLabel">Button label</Label>
        <Input id="ctaLabel" name="ctaLabel" required placeholder="Book Service" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="destinationUrl">Destination link</Label>
          <Input id="destinationUrl" name="destinationUrl" placeholder="https://wa.me/..." />
        </div>
        <div>
          <Label htmlFor="imageUrl">Image URL (optional)</Label>
          <Input id="imageUrl" name="imageUrl" placeholder="https://" />
        </div>
      </div>
      <div>
        <Label htmlFor="offerTerms">Offer terms (optional)</Label>
        <Input id="offerTerms" name="offerTerms" placeholder="Available to Palm Grove Estate residents." />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Target estates</p>
        <p className="mb-2 text-xs text-foreground-muted">
          Leave all unchecked to reach every estate that allows advertising.
        </p>
        {estates.length === 0 ? (
          <p className="text-xs text-foreground-muted">No estates currently allow advertising.</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {estates.map((e) => (
              <Checkbox key={e.id} name="targetEstateIds" value={e.id} label={`${e.name}${e.city ? ` (${e.city})` : ""}`} />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div>
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
      </div>
      <div>
        <Label htmlFor="fixedPriceNaira">Agreed campaign fee (₦, optional)</Label>
        <Input id="fixedPriceNaira" name="fixedPriceNaira" type="number" min="0" step="0.01" placeholder="For NidraQ's records" />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}
