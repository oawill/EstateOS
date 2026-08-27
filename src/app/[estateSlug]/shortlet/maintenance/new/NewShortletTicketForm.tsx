"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { createShortletMaintenanceTicketAction, type ShortletMaintenanceFormState } from "../actions";

const CATEGORIES = [
  "ELECTRICITY",
  "GENERATOR",
  "PLUMBING",
  "WATER",
  "SECURITY",
  "ROADS",
  "DRAINAGE",
  "WASTE",
  "LANDSCAPING",
  "BUILDING",
  "OTHER",
] as const;

const PRIORITIES = [
  ["LOW", "Low"],
  ["MEDIUM", "Medium"],
  ["HIGH", "High"],
  ["URGENT", "Urgent — guest impacted"],
] as const;

interface UnitOption {
  id: string;
  unitLabel: string;
  propertyName: string;
}

const initialState: ShortletMaintenanceFormState = {};

export function NewShortletTicketForm({ estateSlug, units }: { estateSlug: string; units: UnitOption[] }) {
  const action = createShortletMaintenanceTicketAction.bind(null, estateSlug);
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
              {u.propertyName} — {u.unitLabel}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select id="category" name="category" required defaultValue="OTHER">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="description">Describe the issue</Label>
        <Textarea id="description" name="description" required rows={4} placeholder="What's wrong, and since when?" />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="e.g. Kitchen, bathroom" />
      </div>
      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select id="priority" name="priority" required defaultValue="MEDIUM">
          {PRIORITIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
