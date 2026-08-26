"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { createMeterAction, type CreateMeterFormState } from "./actions";

interface UnitOption {
  id: string;
  label: string;
  propertyAddressLabel: string;
}

const initialState: CreateMeterFormState = {};

export function NewMeterForm({ estateSlug, units }: { estateSlug: string; units: UnitOption[] }) {
  const action = createMeterAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="unitId">Unit</Label>
        <Select id="unitId" name="unitId" required defaultValue="">
          <option value="" disabled>
            Select a unit
          </option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.propertyAddressLabel}
              {u.label ? ` · Unit ${u.label}` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="utilityType">Utility</Label>
        <Select id="utilityType" name="utilityType" required defaultValue="ELECTRICITY">
          <option value="ELECTRICITY">Electricity</option>
          <option value="WATER">Water</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="meterNumber">Meter number</Label>
        <Input id="meterNumber" name="meterNumber" required placeholder="e.g. 04012345678" />
      </div>
      <div>
        <Label htmlFor="rateNaira">Rate per unit consumed (₦)</Label>
        <Input id="rateNaira" name="rateNaira" type="number" step="0.01" min="0" required placeholder="e.g. 209.50" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Add meter"}
      </Button>
    </form>
  );
}
