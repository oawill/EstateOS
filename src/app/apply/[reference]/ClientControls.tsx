"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { startApplicationAction } from "../../rentals/actions";

interface ActionState {
  error?: string;
  success?: boolean;
  applicationId?: string;
}
const initialState: ActionState = {};

export function StartApplicationForm({ listingReference }: { listingReference: string }) {
  const [state, formAction, pending] = useActionState(startApplicationAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success && state.applicationId) {
      router.push(`/apply/status/${state.applicationId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <input type="hidden" name="listingReference" value={listingReference} />
      <div>
        <Label htmlFor="sa-name">Full name</Label>
        <Input id="sa-name" name="fullName" required />
      </div>
      <div>
        <Label htmlFor="sa-email">Email</Label>
        <Input id="sa-email" name="email" type="email" />
      </div>
      <div>
        <Label htmlFor="sa-phone">Phone</Label>
        <Input id="sa-phone" name="phone" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Starting…" : "Start Application"}
      </Button>
    </form>
  );
}
