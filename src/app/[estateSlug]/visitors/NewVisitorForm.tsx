"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { createVisitorPassAction, type CreateVisitorPassFormState } from "./actions";

const initialState: CreateVisitorPassFormState = {};

const PASS_TYPES = [
  { value: "VISITOR", label: "Visitor" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "DELIVERY", label: "Delivery / Service Provider" },
] as const;

function defaultDateTime(hoursFromNow: number): string {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function NewVisitorForm({
  estateSlug,
  registeredVehicles = [],
}: {
  estateSlug: string;
  registeredVehicles?: string[];
}) {
  const action = createVisitorPassAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [passType, setPassType] = useState<(typeof PASS_TYPES)[number]["value"]>("VISITOR");

  const nameLabel = passType === "DELIVERY" ? "Provider / company name" : "Visitor name";
  const namePlaceholder = passType === "DELIVERY" ? "e.g. Jumia, DHL, plumber" : "Tunde Adeyemi";

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="passType">Pass type</Label>
        <Select
          id="passType"
          name="passType"
          value={passType}
          onChange={(e) => setPassType(e.target.value as typeof passType)}
        >
          {PASS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="visitorName">{nameLabel}</Label>
        <Input id="visitorName" name="visitorName" required placeholder={namePlaceholder} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="visitorPhone">Phone {passType === "DELIVERY" ? "(optional)" : ""}</Label>
          <Input id="visitorPhone" name="visitorPhone" placeholder="080..." />
        </div>
        <div>
          <Label htmlFor="vehicleNumber">
            Vehicle plate {passType === "VEHICLE" ? "" : "(optional)"}
          </Label>
          <Input
            id="vehicleNumber"
            name="vehicleNumber"
            placeholder="LND-421-KJ"
            required={passType === "VEHICLE"}
            list={registeredVehicles.length > 0 ? "registered-vehicles" : undefined}
          />
          {registeredVehicles.length > 0 && (
            <datalist id="registered-vehicles">
              {registeredVehicles.map((plate) => (
                <option key={plate} value={plate} />
              ))}
            </datalist>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" name="startTime" type="datetime-local" required defaultValue={defaultDateTime(0)} />
        </div>
        <div>
          <Label htmlFor="expiresAt">Expires</Label>
          <Input id="expiresAt" name="expiresAt" type="datetime-local" required defaultValue={defaultDateTime(24)} />
        </div>
      </div>
      <div>
        <Label htmlFor="note">Note to security</Label>
        <Input id="note" name="note" placeholder="Optional note for security" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create Gate Pass"}
      </Button>
    </form>
  );
}
