"use client";

import { useActionState } from "react";
import { Button, Card, FormError, Input, Label, Textarea } from "@/components/shared/ui";
import { createEventAction, type EventFormState } from "../actions";

const initialState: EventFormState = {};

export function NewEventForm({ estateSlug }: { estateSlug: string }) {
  const action = createEventAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" required maxLength={160} />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={3} maxLength={2000} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="eventDate">Date *</Label>
            <Input id="eventDate" name="eventDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="eventTime">Time</Label>
            <Input id="eventTime" name="eventTime" placeholder="e.g. 6:00 PM" />
          </div>
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="e.g. Estate Clubhouse" />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create event"}
        </Button>
      </form>
    </Card>
  );
}
