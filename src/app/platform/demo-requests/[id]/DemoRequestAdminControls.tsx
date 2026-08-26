"use client";

import { useActionState } from "react";
import { DemoRequestStatus } from "@prisma/client";
import { Button, Card, FormError, Select, Textarea } from "@/components/shared/ui";
import {
  assignStaffAction,
  recordScheduledDemoAction,
  updateNotesAction,
  updateStatusAction,
  type DemoRequestActionState,
} from "../actions";

const initial: DemoRequestActionState = {};

function toLocalInputValue(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function DemoRequestAdminControls({
  id,
  status,
  assignedToUserId,
  scheduledDemoAt,
  internalNotes,
  staff,
}: {
  id: string;
  status: DemoRequestStatus;
  assignedToUserId: string | null;
  scheduledDemoAt: Date | null;
  internalNotes: string | null;
  staff: { id: string; name: string }[];
}) {
  const statusActionBound = updateStatusAction.bind(null, id);
  const [statusState, statusFormAction, statusPending] = useActionState(statusActionBound, initial);

  const assignActionBound = assignStaffAction.bind(null, id);
  const [assignState, assignFormAction, assignPending] = useActionState(assignActionBound, initial);

  const scheduleActionBound = recordScheduledDemoAction.bind(null, id);
  const [scheduleState, scheduleFormAction, schedulePending] = useActionState(scheduleActionBound, initial);

  const notesActionBound = updateNotesAction.bind(null, id);
  const [notesState, notesFormAction, notesPending] = useActionState(notesActionBound, initial);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-medium">Status</h2>
        <form action={statusFormAction} className="flex flex-wrap items-center gap-2">
          <FormError message={statusState.error} />
          <Select name="status" defaultValue={status}>
            {Object.values(DemoRequestStatus).map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={statusPending}>
            {statusPending ? "Saving…" : "Update status"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Assigned to</h2>
        <form action={assignFormAction} className="flex flex-wrap items-center gap-2">
          <FormError message={assignState.error} />
          <Select name="assignedToUserId" defaultValue={assignedToUserId ?? ""}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={assignPending}>
            {assignPending ? "Saving…" : "Assign"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Scheduled demo</h2>
        <p className="mb-2 text-xs text-foreground-muted">
          Set this once a demo time is actually confirmed with the prospect — separate from their submitted
          preference.
        </p>
        <form action={scheduleFormAction} className="flex flex-wrap items-center gap-2">
          <FormError message={scheduleState.error} />
          <input
            name="scheduledDemoAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(scheduledDemoAt)}
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" disabled={schedulePending}>
            {schedulePending ? "Saving…" : "Save"}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Internal notes</h2>
        <p className="mb-2 text-xs text-foreground-muted">Never shown to the prospect.</p>
        <form action={notesFormAction} className="space-y-3">
          <FormError message={notesState.error} />
          <Textarea name="internalNotes" rows={4} defaultValue={internalNotes ?? ""} />
          <Button type="submit" disabled={notesPending}>
            {notesPending ? "Saving…" : "Save notes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
