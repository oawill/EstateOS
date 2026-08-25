"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { createPropertyAction, type CreatePropertyFormState } from "./actions";

const PROPERTY_TYPES = [
  ["DETACHED_HOUSE", "Detached house"],
  ["SEMI_DETACHED", "Semi-detached"],
  ["TERRACE", "Terrace"],
  ["FLAT_BLOCK", "Block of flats"],
  ["COMMERCIAL", "Commercial"],
  ["LAND", "Land"],
  ["OTHER", "Other"],
] as const;

interface NamedOption {
  id: string;
  name: string;
}

const initialState: CreatePropertyFormState = {};

export function NewPropertyForm({
  estateSlug,
  blocks,
  streets,
  zones,
}: {
  estateSlug: string;
  blocks: NamedOption[];
  streets: NamedOption[];
  zones: NamedOption[];
}) {
  const action = createPropertyAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="addressLabel">Address / label</Label>
        <Input id="addressLabel" name="addressLabel" required placeholder="Block 4, House 12" />
      </div>
      <div>
        <Label htmlFor="propertyType">Property type</Label>
        <Select id="propertyType" name="propertyType" required defaultValue="DETACHED_HOUSE">
          {PROPERTY_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="blockId">Block</Label>
          <Select id="blockId" name="blockId" defaultValue="">
            <option value="">None</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="streetId">Street</Label>
          <Select id="streetId" name="streetId" defaultValue="">
            <option value="">None</option>
            {streets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="zoneId">Zone</Label>
          <Select id="zoneId" name="zoneId" defaultValue="">
            <option value="">None</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="unitLabels">Unit labels (for a block of flats)</Label>
        <Input id="unitLabels" name="unitLabels" placeholder="1A, 1B, 2A, 2B" />
        <p className="mt-1 text-xs text-slate-500">
          Leave blank for a standalone house — one unit is created automatically.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save property"}
      </Button>
    </form>
  );
}
