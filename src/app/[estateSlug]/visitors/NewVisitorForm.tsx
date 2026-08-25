"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { createVisitorPassAction, type CreateVisitorPassFormState } from "./actions";

const initialState: CreateVisitorPassFormState = {};

function defaultDateTime(hoursFromNow: number): string {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function NewVisitorForm({ estateSlug }: { estateSlug: string }) {
  const action = createVisitorPassAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="visitorName">Visitor name</Label>
        <Input id="visitorName" name="visitorName" required placeholder="Tunde Adeyemi" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="visitorPhone">Phone</Label>
          <Input id="visitorPhone" name="visitorPhone" placeholder="080..." />
        </div>
        <div>
          <Label htmlFor="vehicleNumber">Vehicle number</Label>
          <Input id="vehicleNumber" name="vehicleNumber" placeholder="LND-421-KJ" />
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
        <Label htmlFor="note">Note</Label>
        <Input id="note" name="note" placeholder="Optional note for security" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create visitor pass"}
      </Button>
    </form>
  );
}
