"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, FormError, Input, Label, Select } from "@/components/shared/ui";
import { bookAmenityAction, type BookingFormState } from "./actions";

const initialState: BookingFormState = {};

export interface BookableAmenity {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  maxSlots: number;
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmt(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function BookingForm({ estateSlug, amenities }: { estateSlug: string; amenities: BookableAmenity[] }) {
  const [state, formAction, pending] = useActionState(bookAmenityAction.bind(null, estateSlug), initialState);
  const [amenityId, setAmenityId] = useState(amenities[0]?.id ?? "");
  const amenity = amenities.find((a) => a.id === amenityId) ?? amenities[0];

  const startTimes = useMemo(() => {
    if (!amenity) return [];
    const out: string[] = [];
    for (let t = toMinutes(amenity.openTime); t + amenity.slotMinutes <= toMinutes(amenity.closeTime); t += amenity.slotMinutes) out.push(fmt(t));
    return out;
  }, [amenity]);

  if (!amenity) return null;

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.error} />
      {state.booked && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Booked — it&apos;s in your bookings below.</p>}
      <div>
        <Label htmlFor="am-amenity">Facility</Label>
        <Select id="am-amenity" name="amenityId" value={amenityId} onChange={(e) => setAmenityId(e.target.value)}>
          {amenities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 sm:col-span-1">
          <Label htmlFor="am-date">Date</Label>
          <Input id="am-date" name="date" type="date" required />
        </div>
        <div>
          <Label htmlFor="am-start">Start</Label>
          <Select id="am-start" name="startTime" key={amenity.id}>
            {startTimes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="am-slots">Duration</Label>
          <Select id="am-slots" name="slots" key={`s-${amenity.id}`}>
            {Array.from({ length: amenity.maxSlots }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {(n * amenity.slotMinutes) / 60 >= 1 ? `${(n * amenity.slotMinutes) / 60} hr` : `${n * amenity.slotMinutes} min`}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Booking…" : "Book"}
      </Button>
    </form>
  );
}
