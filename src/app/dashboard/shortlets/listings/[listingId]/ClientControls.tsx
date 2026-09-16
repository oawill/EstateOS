"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { createRatePlanAction, createAvailabilityBlockAction, createOwnerStayAction, type ActionState } from "../../actions";

const initialState: ActionState = {};
const RATE_TYPES = ["DEFAULT", "WEEKEND", "SEASONAL", "DATE_SPECIFIC"] as const;
const BLOCK_REASONS = ["OWNER_BLOCKED", "MAINTENANCE", "TURNOVER", "OTHER"] as const;
const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function RatePlanForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(createRatePlanAction, initialState);
  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <Label htmlFor="rp-type">Type</Label>
        <Select id="rp-type" name="type" defaultValue="WEEKEND">
          {RATE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="rp-rate">Nightly rate (₦)</Label>
        <Input id="rp-rate" name="nightlyRateMinor" type="number" min={0} required />
      </div>
      <div>
        <Label htmlFor="rp-start">Start date (seasonal/date-specific)</Label>
        <Input id="rp-start" name="startDate" type="date" />
      </div>
      <div>
        <Label htmlFor="rp-end">End date (seasonal/date-specific)</Label>
        <Input id="rp-end" name="endDate" type="date" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="rp-days">Days of week (weekend rate only)</Label>
        <Input id="rp-days" name="daysOfWeek" placeholder="e.g. 5,6 for Fri,Sat" />
        <p className="mt-1 text-xs text-foreground-muted">{WEEKDAYS.map((d) => `${d.value}=${d.label}`).join("  ")}</p>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="rp-label">Label</Label>
        <Input id="rp-label" name="label" placeholder="e.g. December Peak Season" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          Add Rate Plan
        </Button>
      </div>
    </form>
  );
}

export function AvailabilityBlockForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(createAvailabilityBlockAction, initialState);
  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <Label htmlFor="ab-start">Start date</Label>
        <Input id="ab-start" name="startDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="ab-end">End date</Label>
        <Input id="ab-end" name="endDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="ab-reason">Reason</Label>
        <Select id="ab-reason" name="reason" defaultValue="MAINTENANCE">
          {BLOCK_REASONS.map((r) => (
            <option key={r} value={r}>
              {r.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="ab-notes">Notes</Label>
        <Textarea id="ab-notes" name="notes" rows={1} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          Block Dates
        </Button>
      </div>
    </form>
  );
}

export function OwnerStayForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(createOwnerStayAction, initialState);
  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <input type="hidden" name="listingId" value={listingId} />
      <div>
        <Label htmlFor="os-start">Start date</Label>
        <Input id="os-start" name="startDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="os-end">End date</Label>
        <Input id="os-end" name="endDate" type="date" required />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          Block for Owner Stay
        </Button>
      </div>
    </form>
  );
}
