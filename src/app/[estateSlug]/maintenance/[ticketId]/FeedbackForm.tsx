"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { submitResidentFeedbackAction, type ResidentFeedbackFormState } from "../actions";

const initialState: ResidentFeedbackFormState = {};

export function FeedbackForm({ estateSlug, ticketId }: { estateSlug: string; ticketId: string }) {
  const action = submitResidentFeedbackAction.bind(null, estateSlug, ticketId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="rating">Rate the service (optional, 1–5)</Label>
        <Input id="rating" name="rating" type="number" min={1} max={5} />
      </div>
      <div>
        <Label htmlFor="feedback">Feedback (optional)</Label>
        <Input id="feedback" name="feedback" placeholder="Anything else to share?" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" name="satisfied" value="true" disabled={pending}>
          Yes, resolved
        </Button>
        <Button type="submit" name="satisfied" value="false" variant="secondary" disabled={pending}>
          No, not resolved
        </Button>
      </div>
    </form>
  );
}
