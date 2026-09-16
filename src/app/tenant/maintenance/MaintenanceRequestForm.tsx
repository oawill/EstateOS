"use client";

import { useActionState } from "react";
import { Button, FormError, Select, Textarea, Checkbox, Label } from "@/components/shared/ui";
import { submitMaintenanceRequestAction, type ActionState } from "../actions";

const initialState: ActionState = {};

const CATEGORIES = [
  "PLUMBING",
  "ELECTRICAL",
  "AIR_CONDITIONING",
  "APPLIANCE",
  "STRUCTURAL",
  "SECURITY",
  "WATER",
  "GENERATOR_POWER",
  "CLEANING",
  "OTHER",
] as const;

export function MaintenanceRequestForm({ propertyId, unitId }: { propertyId: string; unitId: string }) {
  const [state, formAction, pending] = useActionState(submitMaintenanceRequestAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="unitId" value={unitId} />
      <div>
        <Label htmlFor="m-category">Category</Label>
        <Select id="m-category" name="category" defaultValue="OTHER">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="m-priority">Priority</Label>
        <Select id="m-priority" name="priority" defaultValue="MEDIUM">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="m-description">Describe the issue</Label>
        <Textarea id="m-description" name="description" rows={3} required />
      </div>
      <Checkbox name="permissionToEnter" label="I give permission to enter the unit if I'm not home" />
      <div>
        <Label htmlFor="m-contact">Preferred contact method</Label>
        <Select id="m-contact" name="preferredContactMethod" defaultValue="phone">
          <option value="phone">Phone call</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting…" : "Submit Request"}
      </Button>
    </form>
  );
}
