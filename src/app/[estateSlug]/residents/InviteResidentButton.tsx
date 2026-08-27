"use client";

import { useActionState } from "react";
import { inviteResidentAction, type InviteResidentActionState } from "./actions";

const initialState: InviteResidentActionState = {};

export function InviteResidentButton({ estateSlug, residentId }: { estateSlug: string; residentId: string }) {
  const action = inviteResidentAction.bind(null, estateSlug, residentId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.success) {
    return <p className="text-xs text-success">Invite sent</p>;
  }

  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className="text-xs text-primary underline underline-offset-2 disabled:opacity-50">
        {pending ? "Sending…" : "Invite to EstateOS"}
      </button>
      {state.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
