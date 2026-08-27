"use client";

import { useActionState } from "react";
import { Button, Card, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { getShortletUploadUrlAction } from "../uploadActions";
import { createPropertyAction, type CreatePropertyFormState } from "./actions";

const PROPERTY_TYPES: [string, string][] = [
  ["APARTMENT", "Apartment"],
  ["HOUSE", "House"],
  ["VILLA", "Villa"],
  ["STUDIO", "Studio"],
  ["DUPLEX", "Duplex"],
  ["PENTHOUSE", "Penthouse"],
  ["OTHER", "Other"],
];

const initialState: CreatePropertyFormState = {};

export function NewPropertyForm({ estateSlug }: { estateSlug: string }) {
  const action = createPropertyAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Basics</p>
        <div>
          <Label htmlFor="name">Property name</Label>
          <Input id="name" name="name" required maxLength={160} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="propertyType">Property type</Label>
            <Select id="propertyType" name="propertyType" required defaultValue="APARTMENT">
              {PROPERTY_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="maxGuests">Max guests</Label>
            <Input id="maxGuests" name="maxGuests" type="number" min={1} required defaultValue={2} />
          </div>
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" required maxLength={300} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" required maxLength={100} />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" required maxLength={100} defaultValue="Nigeria" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Input id="bedrooms" name="bedrooms" type="number" min={0} required defaultValue={1} />
          </div>
          <div>
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Input id="bathrooms" name="bathrooms" type="number" min={0} required defaultValue={1} />
          </div>
        </div>
        <div>
          <Label htmlFor="amenities">Amenities (comma-separated)</Label>
          <Input id="amenities" name="amenities" placeholder="Wi-Fi, Pool, Generator, Air conditioning" />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={3} maxLength={4000} />
        </div>
        <div>
          <Label htmlFor="houseRules">House rules</Label>
          <Textarea id="houseRules" name="houseRules" rows={3} maxLength={4000} />
        </div>
        <div>
          <Label>Photos</Label>
          <ImageUploader
            name="photoUrls"
            getUploadUrl={(filename, contentType) => getShortletUploadUrlAction(estateSlug, filename, contentType)}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Stay terms</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkInTime">Check-in time</Label>
            <Input id="checkInTime" name="checkInTime" type="time" required defaultValue="15:00" />
          </div>
          <div>
            <Label htmlFor="checkOutTime">Check-out time</Label>
            <Input id="checkOutTime" name="checkOutTime" type="time" required defaultValue="11:00" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minStayNights">Minimum stay (nights)</Label>
            <Input id="minStayNights" name="minStayNights" type="number" min={1} defaultValue={1} />
          </div>
          <div>
            <Label htmlFor="maxStayNights">Maximum stay (nights)</Label>
            <Input id="maxStayNights" name="maxStayNights" type="number" min={1} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Pricing (minor units, e.g. kobo)</p>
        <div>
          <Label htmlFor="baseNightlyRateMinor">Base nightly rate</Label>
          <Input id="baseNightlyRateMinor" name="baseNightlyRateMinor" type="number" min={0} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cleaningFeeMinor">Cleaning fee</Label>
            <Input id="cleaningFeeMinor" name="cleaningFeeMinor" type="number" min={0} defaultValue={0} />
          </div>
          <div>
            <Label htmlFor="securityDepositMinor">Security deposit</Label>
            <Input id="securityDepositMinor" name="securityDepositMinor" type="number" min={0} defaultValue={0} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Units</p>
        <div>
          <Label htmlFor="unitLabels">Unit labels (comma-separated — leave blank for a single &quot;Unit 1&quot;)</Label>
          <Input id="unitLabels" name="unitLabels" placeholder="Unit 1A, Unit 1B, Unit 2A" />
        </div>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create property"}
      </Button>
    </form>
  );
}
