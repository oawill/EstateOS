"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { createTicketAction, type CreateTicketFormState } from "./actions";

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
  ["URGENT", "Urgent"],
] as const;

const initialState: CreateTicketFormState = {};

export function NewTicketForm({ estateSlug }: { estateSlug: string }) {
  const action = createTicketAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
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
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          placeholder="What's wrong, and since when?"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="e.g. Block A, near the gate" />
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
