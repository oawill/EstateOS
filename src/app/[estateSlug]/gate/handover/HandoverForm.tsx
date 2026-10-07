"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Textarea } from "@/components/shared/ui";
import { createHandoverAction, type HandoverFormState } from "./actions";

const initialState: HandoverFormState = {};

export function HandoverForm({ estateSlug }: { estateSlug: string }) {
  const [state, formAction, pending] = useActionState(createHandoverAction.bind(null, estateSlug), initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      {state.saved && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Handover note saved.</p>}
      <div>
        <Label htmlFor="ho-gate">Gate (optional)</Label>
        <Input id="ho-gate" name="gate" placeholder="Main Gate" />
      </div>
      <div>
        <Label htmlFor="ho-notes">Notes for the next shift</Label>
        <Textarea id="ho-notes" name="notes" rows={4} required placeholder="Pending approvals, vehicles to watch, anything unresolved…" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save handover note"}
      </Button>
    </form>
  );
}
