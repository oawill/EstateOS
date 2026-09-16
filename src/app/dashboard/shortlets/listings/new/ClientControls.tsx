"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FormError, Input, Label, Textarea } from "@/components/shared/ui";
import { createShortletListingAction } from "../../actions";

interface UnlistedUnit {
  id: string;
  label: string;
  property: { name: string };
}

export function NewListingForm({ units, defaultUnitId }: { units: UnlistedUnit[]; defaultUnitId?: string }) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const router = useRouter();

  if (units.length === 0) {
    return <p className="text-sm text-foreground-muted">No unlisted units available on your assigned properties.</p>;
  }

  return (
    <form
      action={async (formData: FormData) => {
        setPending(true);
        const result = await createShortletListingAction({}, formData);
        setPending(false);
        if (result.error) setError(result.error);
        else router.push("/dashboard/shortlets/listings");
      }}
      className="space-y-3"
    >
      <FormError message={error} />
      <div>
        <Label htmlFor="nsl-unit">Unit</Label>
        <select id="nsl-unit" name="unitId" defaultValue={defaultUnitId} required className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <option value="">Select a unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.property.name} · {u.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="nsl-title">Title</Label>
        <Input id="nsl-title" name="title" required maxLength={160} placeholder="Cozy 2-bed serviced apartment in Ikoyi" />
      </div>
      <div>
        <Label htmlFor="nsl-description">Description</Label>
        <Textarea id="nsl-description" name="description" required rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="nsl-bedrooms">Bedrooms</Label>
          <Input id="nsl-bedrooms" name="bedrooms" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="nsl-bathrooms">Bathrooms</Label>
          <Input id="nsl-bathrooms" name="bathrooms" type="number" min={0} />
        </div>
      </div>
      <div>
        <Label htmlFor="nsl-guests">Maximum guests</Label>
        <Input id="nsl-guests" name="maxGuests" type="number" min={1} required />
      </div>
      <div>
        <Label htmlFor="nsl-amenities">Amenities (comma-separated)</Label>
        <Input id="nsl-amenities" name="amenities" placeholder="Wi-Fi, Pool, Generator" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="nsl-checkin">Check-in time</Label>
          <Input id="nsl-checkin" name="checkInTime" defaultValue="15:00" required />
        </div>
        <div>
          <Label htmlFor="nsl-checkout">Check-out time</Label>
          <Input id="nsl-checkout" name="checkOutTime" defaultValue="11:00" required />
        </div>
      </div>
      <div>
        <Label htmlFor="nsl-rate">Base nightly rate (₦)</Label>
        <Input id="nsl-rate" name="baseNightlyRateMinor" type="number" min={0} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="nsl-cleaning">Cleaning fee (₦)</Label>
          <Input id="nsl-cleaning" name="cleaningFeeMinor" type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label htmlFor="nsl-deposit">Security deposit (₦)</Label>
          <Input id="nsl-deposit" name="securityDepositMinor" type="number" min={0} defaultValue={0} />
        </div>
      </div>
      <div>
        <Label htmlFor="nsl-minstay">Minimum stay (nights)</Label>
        <Input id="nsl-minstay" name="minStayNights" type="number" min={1} defaultValue={1} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create Listing"}
      </Button>
    </form>
  );
}
