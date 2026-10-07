"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { createAmenityAction, type AmenityFormState } from "./actions";

const initialState: AmenityFormState = {};

export function AmenityForm({ estateSlug }: { estateSlug: string }) {
  const [state, formAction, pending] = useActionState(createAmenityAction.bind(null, estateSlug), initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      {state.saved && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Facility added.</p>}
      <div>
        <Label htmlFor="amn-name">Name</Label>
        <Input id="amn-name" name="name" required placeholder="Clubhouse, Tennis court, Pool…" />
      </div>
      <div>
        <Label htmlFor="amn-desc">Description (optional)</Label>
        <Input id="amn-desc" name="description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amn-open">Opens</Label>
          <Input id="amn-open" name="openTime" type="time" defaultValue="08:00" required />
        </div>
        <div>
          <Label htmlFor="amn-close">Closes</Label>
          <Input id="amn-close" name="closeTime" type="time" defaultValue="20:00" required />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="amn-slot">Slot length</Label>
          <Select id="amn-slot" name="slotMinutes" defaultValue="60">
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="amn-max">Max slots / booking</Label>
          <Input id="amn-max" name="maxSlots" type="number" min={1} max={8} defaultValue={3} required />
        </div>
        <div>
          <Label htmlFor="amn-cap">Bookings per slot</Label>
          <Input id="amn-cap" name="capacity" type="number" min={1} max={100} defaultValue={1} required />
        </div>
      </div>
      <div>
        <Label htmlFor="amn-fee">Fee note (optional, informational only)</Label>
        <Input id="amn-fee" name="feeNote" placeholder="e.g. ₦5,000 per hour, paid at the estate office" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Add facility"}
      </Button>
    </form>
  );
}
