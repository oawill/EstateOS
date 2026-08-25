"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { createResidentAction, type CreateResidentFormState } from "./actions";

interface UnitOption {
  id: string;
  label: string;
  propertyAddressLabel: string;
}

const OCCUPANCY_ROLES = [
  ["OWNER", "Owner"],
  ["TENANT", "Tenant"],
  ["HOUSEHOLD_MEMBER", "Household member"],
] as const;

const initialState: CreateResidentFormState = {};

export function NewResidentForm({ estateSlug, units }: { estateSlug: string; units: UnitOption[] }) {
  const action = createResidentAction.bind(null, estateSlug);
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="occupancyRole">Role</Label>
          <Select id="occupancyRole" name="occupancyRole" required defaultValue="OWNER">
            {OCCUPANCY_ROLES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="moveInDate">Move-in date</Label>
          <Input id="moveInDate" name="moveInDate" type="date" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emergencyContactName">Emergency contact name</Label>
          <Input id="emergencyContactName" name="emergencyContactName" />
        </div>
        <div>
          <Label htmlFor="emergencyContactPhone">Emergency contact phone</Label>
          <Input id="emergencyContactPhone" name="emergencyContactPhone" />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save resident"}
      </Button>
    </form>
  );
}
