"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { recordReadingAction, type RecordReadingFormState } from "../../../../actions";

const initialState: RecordReadingFormState = {};

export function RecordReadingForm({ estateSlug, meterId }: { estateSlug: string; meterId: string }) {
  const action = recordReadingAction.bind(null, estateSlug, meterId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="currentReading">Current reading</Label>
        <Input id="currentReading" name="currentReading" type="number" min="0" required />
      </div>
      <div>
        <Label htmlFor="readingDate">Reading date</Label>
        <Input id="readingDate" name="readingDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save reading"}
      </Button>
    </form>
  );
}
