"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { setReadinessFlagAction } from "../actions";

interface ActionState {
  error?: string;
}
const initialState: ActionState = {};

const SCREENING_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "ISSUE_FOUND", "NOT_APPLICABLE"] as const;

export function ScreeningItemForm({
  applicationId,
  checkType,
  status,
  notes,
  action,
}: {
  applicationId: string;
  checkType: string;
  status: string;
  notes: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 border-b border-border pb-2 text-sm">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="checkType" value={checkType} />
      <span className="w-56 shrink-0">{checkType.replaceAll("_", " ")}</span>
      <Select name="status" defaultValue={status} className="w-44">
        {SCREENING_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replaceAll("_", " ")}
          </option>
        ))}
      </Select>
      <Input name="notes" defaultValue={notes} placeholder="Notes" className="flex-1" />
      <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
        Save
      </Button>
      {state.error && <span className="w-full text-xs text-danger">{state.error}</span>}
    </form>
  );
}

export function NoteForm({
  applicationId,
  action,
}: {
  applicationId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <Textarea name="body" rows={2} placeholder="Add an internal note…" required />
      <Button type="submit" variant="secondary" disabled={pending}>
        Add Note
      </Button>
    </form>
  );
}

const DECISIONS = ["APPROVE", "REQUEST_MORE_INFO", "REJECT", "WITHDRAWN"] as const;

export function DecisionForm({
  applicationId,
  action,
}: {
  applicationId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-2">
      <FormError message={state.error} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="flex flex-wrap gap-2">
        <Select name="decision" className="w-48" required>
          {DECISIONS.map((d) => (
            <option key={d} value={d}>
              {d.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <Input name="reason" placeholder="Documented reason (required)" className="flex-1" required />
        <Button type="submit" disabled={pending}>
          Record Decision
        </Button>
      </div>
    </form>
  );
}

export function OfferForm({
  applicationId,
  action,
}: {
  applicationId: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <Label htmlFor="of-rent">Rent (₦)</Label>
        <Input id="of-rent" name="rentAmountMinor" type="number" min={0} required />
      </div>
      <div>
        <Label htmlFor="of-frequency">Frequency</Label>
        <Select id="of-frequency" name="paymentFrequency" defaultValue="ANNUAL">
          {["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "CUSTOM"].map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="of-service">Service charge (₦)</Label>
        <Input id="of-service" name="serviceChargeMinor" type="number" min={0} defaultValue={0} />
      </div>
      <div>
        <Label htmlFor="of-deposit">Security deposit (₦)</Label>
        <Input id="of-deposit" name="securityDepositMinor" type="number" min={0} defaultValue={0} />
      </div>
      <div>
        <Label htmlFor="of-duration">Lease duration (months)</Label>
        <Input id="of-duration" name="leaseDurationMonths" type="number" min={1} defaultValue={12} required />
      </div>
      <div>
        <Label htmlFor="of-start">Proposed start date</Label>
        <Input id="of-start" name="proposedStartDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="of-expires">Offer expires</Label>
        <Input id="of-expires" name="expiresAt" type="date" required />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="of-conditions">Special conditions</Label>
        <Textarea id="of-conditions" name="specialConditions" rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          Send Offer
        </Button>
      </div>
    </form>
  );
}

export function LeaseSignedForm({ leaseId, applicationId }: { leaseId: string; applicationId: string }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const { recordLeaseSignedAction } = await import("../actions");
      return recordLeaseSignedAction(prev, formData);
    },
    initialState,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <FormError message={state.error} />
      <input type="hidden" name="leaseId" value={leaseId} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <Input name="documentUrl" placeholder="Signed document URL" className="w-64" required />
      <Button type="submit" variant="success" disabled={pending}>
        Record as Signed
      </Button>
    </form>
  );
}

export function ReadinessToggle({
  moveInId,
  applicationId,
  field,
  label,
  value,
}: {
  moveInId: string;
  applicationId: string;
  field: string;
  label: string;
  value: boolean;
}) {
  return (
    <form action={setReadinessFlagAction.bind(null, moveInId, field, !value, applicationId)} className="flex items-center justify-between">
      <span>{label}</span>
      <Button type="submit" variant={value ? "success" : "secondary"} className="px-2 py-1 text-xs">
        {value ? "Done" : "Mark done"}
      </Button>
    </form>
  );
}

export function OverrideForm({ moveInId, applicationId }: { moveInId: string; applicationId: string }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const { overrideReadinessItemAction } = await import("../actions");
      return overrideReadinessItemAction(prev, formData);
    },
    initialState,
  );
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <FormError message={state.error} />
      <input type="hidden" name="moveInId" value={moveInId} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <Select name="item" className="w-56">
        {[
          "documentsComplete",
          "moveInDateConfirmed",
          "inspectionScheduled",
          "keysPrepared",
          "estateRegistrationComplete",
          "utilitiesSetupComplete",
        ].map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Input name="reason" placeholder="Override reason (required)" className="flex-1" required />
      <Button type="submit" variant="danger" disabled={pending}>
        Override
      </Button>
    </form>
  );
}
