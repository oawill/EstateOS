"use client";

import { useActionState } from "react";
import { Button, FormError, Input, Label, Select, Textarea } from "@/components/shared/ui";
import { createDirectBookingAction, type ActionState } from "../actions";

const initialState: ActionState = {};
const SOURCES = ["DIRECT", "WHATSAPP", "PHONE", "WALK_IN", "CORPORATE", "OTHER"] as const;

export function NewDirectBookingForm({ listings }: { listings: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(createDirectBookingAction, initialState);

  if (listings.length === 0) {
    return <p className="text-sm text-foreground-muted">No active listings yet — publish a listing first.</p>;
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormError message={state.error} />
      <div className="sm:col-span-2">
        <Label htmlFor="db-listing">Listing</Label>
        <Select id="db-listing" name="listingId" required>
          <option value="">Select a listing</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="db-name">Guest name</Label>
        <Input id="db-name" name="fullName" required />
      </div>
      <div>
        <Label htmlFor="db-phone">Guest phone</Label>
        <Input id="db-phone" name="phone" />
      </div>
      <div>
        <Label htmlFor="db-email">Guest email</Label>
        <Input id="db-email" name="email" type="email" />
      </div>
      <div>
        <Label htmlFor="db-source">Booking source</Label>
        <Select id="db-source" name="bookingSource" defaultValue="DIRECT">
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="db-checkin">Check-in date</Label>
        <Input id="db-checkin" name="checkInDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="db-checkout">Check-out date</Label>
        <Input id="db-checkout" name="checkOutDate" type="date" required />
      </div>
      <div>
        <Label htmlFor="db-guests">Number of guests</Label>
        <Input id="db-guests" name="numberOfGuests" type="number" min={1} required />
      </div>
      <div>
        <Label htmlFor="db-discount">Discount (₦)</Label>
        <Input id="db-discount" name="discountMinor" type="number" min={0} defaultValue={0} />
      </div>
      <div>
        <Label htmlFor="db-fees">Additional fees (₦)</Label>
        <Input id="db-fees" name="additionalFeesMinor" type="number" min={0} defaultValue={0} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="db-notes">Notes</Label>
        <Textarea id="db-notes" name="notes" rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create Booking"}
        </Button>
      </div>
    </form>
  );
}
