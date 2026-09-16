"use client";

import { useActionState, useState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { updateReminderSettingAction, runReminderSweepAction, type ActionState } from "../actions";

const initialState: ActionState = {};

export function ReminderSettingForm({ beforeDueDays, afterDueDays }: { beforeDueDays: number[]; afterDueDays: number[] }) {
  const [state, formAction, pending] = useActionState(updateReminderSettingAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      <div>
        <Label htmlFor="before">Days before rent is due</Label>
        <Input id="before" name="beforeDueDays" defaultValue={beforeDueDays.join(", ")} placeholder="30, 14, 7" />
      </div>
      <div>
        <Label htmlFor="after">Days after rent is overdue</Label>
        <Input id="after" name="afterDueDays" defaultValue={afterDueDays.join(", ")} placeholder="1, 7, 14, 30" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save Reminder Settings"}
      </Button>
    </form>
  );
}

export function RunReminderSweepButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number } | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const r = await runReminderSweepAction();
          setResult(r);
          setPending(false);
        }}
      >
        {pending ? "Sending…" : "Send Reminders Now"}
      </Button>
      {result && (
        <p className="text-sm text-foreground-muted">
          {result.sent} reminder{result.sent === 1 ? "" : "s"} sent, {result.skipped} already sent (skipped).
        </p>
      )}
    </div>
  );
}
