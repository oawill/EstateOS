"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label } from "@/components/shared/ui";
import { requestBookingAction } from "../actions";

interface ActionState {
  error?: string;
  success?: boolean;
  bookingReference?: string;
}
const initialState: ActionState = {};

export function BookingRequestForm({
  listingReference,
  maxGuests,
  minStayNights,
}: {
  listingReference: string;
  maxGuests: number;
  minStayNights: number;
}) {
  const [state, formAction, pending] = useActionState(requestBookingAction, initialState);

  if (state.success) {
    return (
      <p className="text-sm text-success">
        Booking request received — reference <strong>{state.bookingReference}</strong>. The operator will be in touch to
        confirm payment.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <input type="hidden" name="listingReference" value={listingReference} />
      <div>
        <Label htmlFor="bk-checkin">Check-in</Label>
        <Input id="bk-checkin" name="checkInDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="bk-checkout">Check-out</Label>
        <Input id="bk-checkout" name="checkOutDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="bk-guests">Number of guests</Label>
        <Input id="bk-guests" name="numberOfGuests" type="number" min={1} max={maxGuests} defaultValue={1} required />
      </div>
      <div>
        <Label htmlFor="bk-name">Your name</Label>
        <Input id="bk-name" name="fullName" required />
      </div>
      <div>
        <Label htmlFor="bk-email">Email</Label>
        <Input id="bk-email" name="email" type="email" />
      </div>
      <div>
        <Label htmlFor="bk-phone">Phone</Label>
        <Input id="bk-phone" name="phone" />
      </div>
      <p className="text-xs text-foreground-muted sm:col-span-2">Minimum stay: {minStayNights} night(s).</p>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Request Booking"}
        </Button>
      </div>
    </form>
  );
}
