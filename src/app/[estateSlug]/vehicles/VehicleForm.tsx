"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { addVehicleAction, type VehicleFormState } from "./actions";

const initialState: VehicleFormState = {};

export function VehicleForm({ estateSlug }: { estateSlug: string }) {
  const [state, formAction, pending] = useActionState(addVehicleAction.bind(null, estateSlug), initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <div className="sm:col-span-2">
        <Label htmlFor="veh-plate">Plate number</Label>
        <Input id="veh-plate" name="plateNumber" required placeholder="LND-234-XY" />
      </div>
      <div>
        <Label htmlFor="veh-make">Make</Label>
        <Input id="veh-make" name="make" placeholder="Toyota" />
      </div>
      <div>
        <Label htmlFor="veh-model">Model</Label>
        <Input id="veh-model" name="model" placeholder="Camry" />
      </div>
      <div>
        <Label htmlFor="veh-color">Color</Label>
        <Input id="veh-color" name="color" placeholder="Black" />
      </div>
      <div className="flex items-end sm:col-span-2">
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Adding…" : "Add Vehicle"}
        </Button>
      </div>
    </form>
  );
}
