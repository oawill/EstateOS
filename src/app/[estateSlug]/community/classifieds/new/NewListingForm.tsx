"use client";

import { useActionState, useState } from "react";
import { Button, Card, Checkbox, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { getUploadUrlAction } from "@/app/[estateSlug]/community/uploadActions";
import { createListingAction, type ListingFormState } from "../actions";

const CONDITIONS: [string, string][] = [
  ["NEW", "New"],
  ["USED_LIKE_NEW", "Used — like new"],
  ["USED_GOOD", "Used — good condition"],
  ["USED_FAIR", "Used — fair condition"],
  ["FOR_PARTS", "For parts"],
];

const initialState: ListingFormState = {};

export function NewListingForm({ estateSlug, categories }: { estateSlug: string; categories: { id: string; key: string; label: string }[] }) {
  const action = createListingAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [categoryKey, setCategoryKey] = useState("");
  const isShortlet = categoryKey === "SHORTLETS";

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required maxLength={160} />
        </div>
        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea id="description" name="description" required rows={4} maxLength={2000} />
        </div>
        <div>
          <Label htmlFor="categoryId">Category *</Label>
          <Select
            id="categoryId"
            name="categoryId"
            required
            defaultValue=""
            onChange={(e) => setCategoryKey(e.target.selectedOptions[0]?.dataset.key ?? "")}
          >
            <option value="" disabled>
              Select one
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} data-key={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priceKobo">{isShortlet ? "Nightly rate (₦)" : "Price (₦)"}</Label>
            <Input id="priceKobo" name={isShortlet ? "nightlyRateKobo" : "priceKobo"} type="number" min="0" step="1" placeholder="Leave blank if free" />
          </div>
          <div className="flex items-end pb-2.5">
            <Checkbox name="negotiable" label="Negotiable" />
          </div>
        </div>

        {!isShortlet && (
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select id="condition" name="condition" defaultValue="">
              <option value="">Not applicable</option>
              {CONDITIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {isShortlet && (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Shortlet details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input id="bedrooms" name="bedrooms" type="number" min="0" step="1" />
              </div>
              <div>
                <Label htmlFor="maxGuests">Max guests</Label>
                <Input id="maxGuests" name="maxGuests" type="number" min="1" step="1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="availableFrom">Available from</Label>
                <Input id="availableFrom" name="availableFrom" type="date" />
              </div>
              <div>
                <Label htmlFor="availableTo">Available to</Label>
                <Input id="availableTo" name="availableTo" type="date" />
              </div>
            </div>
            <div>
              <Label htmlFor="amenities">Amenities</Label>
              <Input id="amenities" name="amenities" placeholder="Wi-Fi, Air conditioning, Pool (comma-separated)" />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="locationNote">Location within estate (optional)</Label>
          <Input id="locationNote" name="locationNote" placeholder="e.g. Near Block C — not your exact unit" maxLength={120} />
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-foreground">Contact method(s)</legend>
          <Checkbox name="contactMethods" value="IN_APP" label="In-app message" defaultChecked />
          <Checkbox name="contactMethods" value="WHATSAPP" label="WhatsApp" />
          <Checkbox name="contactMethods" value="PHONE" label="Phone" />
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="whatsappNumber">WhatsApp number</Label>
            <Input id="whatsappNumber" name="whatsappNumber" placeholder="Optional" />
          </div>
          <div>
            <Label htmlFor="phoneNumber">Phone number</Label>
            <Input id="phoneNumber" name="phoneNumber" placeholder="Optional" />
          </div>
        </div>

        <div>
          <Label htmlFor="expiresAt">Listing expires</Label>
          <Input id="expiresAt" name="expiresAt" type="date" />
        </div>

        <div>
          <Label>Photos</Label>
          <ImageUploader name="imageUrls" getUploadUrl={(filename, contentType) => getUploadUrlAction(estateSlug, filename, contentType)} />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Publishing…" : "Publish listing"}
        </Button>
      </form>
    </Card>
  );
}
