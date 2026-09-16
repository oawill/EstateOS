"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";

interface VacantUnit {
  id: string;
  label: string;
  rentAmountMinor: number;
  rentFrequency: string;
  serviceChargeMinor: number;
  securityDepositMinor: number;
  bedrooms: number | null;
  bathrooms: number | null;
  property: { name: string };
}

interface ActionState {
  error?: string;
}

const initialState: ActionState = {};
const FREQUENCIES = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "CUSTOM"] as const;
const FURNISHED = ["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"] as const;

export function NewListingForm({
  units,
  action,
}: {
  units: VacantUnit[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  if (units.length === 0) {
    return <p className="text-sm text-foreground-muted">No vacant units are available to list right now.</p>;
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <div className="sm:col-span-2">
        <Label htmlFor="nl-unit">Unit</Label>
        <Select id="nl-unit" name="unitId" required>
          <option value="">Select a vacant unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.property.name} · {u.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="nl-title">Title</Label>
        <Input id="nl-title" name="title" required maxLength={160} placeholder="Spacious 2-bed apartment in Lekki" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="nl-description">Description</Label>
        <Textarea id="nl-description" name="description" required rows={3} />
      </div>
      <div>
        <Label htmlFor="nl-rent">Rent (₦)</Label>
        <Input id="nl-rent" name="rentAmountMinor" type="number" min={0} required />
      </div>
      <div>
        <Label htmlFor="nl-frequency">Frequency</Label>
        <Select id="nl-frequency" name="rentFrequency" defaultValue="ANNUAL">
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="nl-service">Service charge (₦)</Label>
        <Input id="nl-service" name="serviceChargeMinor" type="number" min={0} defaultValue={0} />
      </div>
      <div>
        <Label htmlFor="nl-deposit">Security deposit (₦)</Label>
        <Input id="nl-deposit" name="securityDepositMinor" type="number" min={0} defaultValue={0} />
      </div>
      <div>
        <Label htmlFor="nl-bedrooms">Bedrooms</Label>
        <Input id="nl-bedrooms" name="bedrooms" type="number" min={0} />
      </div>
      <div>
        <Label htmlFor="nl-bathrooms">Bathrooms</Label>
        <Input id="nl-bathrooms" name="bathrooms" type="number" min={0} />
      </div>
      <div>
        <Label htmlFor="nl-furnished">Furnished status</Label>
        <Select id="nl-furnished" name="furnishedStatus" defaultValue="UNFURNISHED">
          {FURNISHED.map((f) => (
            <option key={f} value={f}>
              {f.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="nl-available">Available from</Label>
        <Input id="nl-available" name="availableDate" type="date" required />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="nl-amenities">Amenities (comma-separated)</Label>
        <Input id="nl-amenities" name="amenities" placeholder="Gym, Pool, 24/7 Power" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="nl-area">Display area (public, e.g. neighborhood only)</Label>
        <Input id="nl-area" name="displayArea" placeholder="Lekki Phase 1" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create Listing"}
        </Button>
      </div>
    </form>
  );
}
