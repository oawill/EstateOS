"use client";

import { useActionState } from "react";
import { Button, Card, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { createReservationAction, type ReservationFormState } from "./actions";

const BOOKING_SOURCES: [string, string][] = [
  ["DIRECT", "Direct"],
  ["WHATSAPP", "WhatsApp"],
  ["PHONE", "Phone"],
  ["WEBSITE", "Website"],
  ["WALK_IN", "Walk-in"],
  ["AIRBNB", "Airbnb"],
  ["BOOKING_COM", "Booking.com"],
  ["EXPEDIA", "Expedia"],
  ["CORPORATE", "Corporate"],
  ["TRAVEL_AGENT", "Travel agent"],
  ["OTHER", "Other"],
];

interface UnitOption {
  id: string;
  unitLabel: string;
  propertyName: string;
  baseNightlyRateMinor: number;
}

interface GuestOption {
  id: string;
  fullName: string;
  phone: string;
}

const initialState: ReservationFormState = {};

export function NewReservationForm({
  estateSlug,
  units,
  guests,
}: {
  estateSlug: string;
  units: UnitOption[];
  guests: GuestOption[];
}) {
  const action = createReservationAction.bind(null, estateSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Stay</p>
        <div>
          <Label htmlFor="unitId">Unit</Label>
          <Select id="unitId" name="unitId" required defaultValue="">
            <option value="" disabled>
              Select a unit
            </option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.propertyName} — {u.unitLabel}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="guestId">Guest</Label>
          <Select id="guestId" name="guestId" required defaultValue="">
            <option value="" disabled>
              Select a guest
            </option>
            {guests.map((g) => (
              <option key={g.id} value={g.id}>
                {g.fullName} ({g.phone})
              </option>
            ))}
          </Select>
          {guests.length === 0 && (
            <p className="mt-1 text-xs text-foreground-muted">
              No guests yet — add one from the Guests tab first.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkInDate">Check-in date</Label>
            <Input id="checkInDate" name="checkInDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="checkOutDate">Check-out date</Label>
            <Input id="checkOutDate" name="checkOutDate" type="date" required />
          </div>
        </div>
        <div>
          <Label htmlFor="numberOfGuests">Number of guests</Label>
          <Input id="numberOfGuests" name="numberOfGuests" type="number" min={1} required defaultValue={1} />
        </div>
        <div>
          <Label htmlFor="bookingSource">Booking source</Label>
          <Select id="bookingSource" name="bookingSource" required defaultValue="DIRECT">
            {BOOKING_SOURCES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="text-sm font-medium text-foreground-muted">Charges (minor units)</p>
        <div>
          <Label htmlFor="nightlyRateMinor">Nightly rate</Label>
          <Input id="nightlyRateMinor" name="nightlyRateMinor" type="number" min={0} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="taxesMinor">Taxes</Label>
            <Input id="taxesMinor" name="taxesMinor" type="number" min={0} defaultValue={0} />
          </div>
          <div>
            <Label htmlFor="cleaningFeeMinor">Cleaning fee</Label>
            <Input id="cleaningFeeMinor" name="cleaningFeeMinor" type="number" min={0} defaultValue={0} />
          </div>
          <div>
            <Label htmlFor="securityDepositMinor">Security deposit</Label>
            <Input id="securityDepositMinor" name="securityDepositMinor" type="number" min={0} defaultValue={0} />
          </div>
          <div>
            <Label htmlFor="additionalFeesMinor">Additional fees</Label>
            <Input id="additionalFeesMinor" name="additionalFeesMinor" type="number" min={0} defaultValue={0} />
          </div>
          <div>
            <Label htmlFor="discountMinor">Discount</Label>
            <Input id="discountMinor" name="discountMinor" type="number" min={0} defaultValue={0} />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
        </div>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create reservation"}
      </Button>
    </form>
  );
}
