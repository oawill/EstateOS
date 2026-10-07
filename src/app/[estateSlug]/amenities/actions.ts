"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { bookAmenity, cancelBooking } from "@/server/modules/amenities/service";
import { getResidentByUserId } from "@/server/modules/residents/service";

export interface BookingFormState {
  error?: string;
  booked?: boolean;
}

async function requireResident(estateSlug: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "own-amenities:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");
  return { membership, resident };
}

export async function bookAmenityAction(estateSlug: string, _prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const { membership, resident } = await requireResident(estateSlug);

  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) return { error: "Choose a date and start time." };

  try {
    await bookAmenity(membership.estateId, resident.id, {
      amenityId: String(formData.get("amenityId") ?? ""),
      date,
      startTime,
      slots: Number(formData.get("slots") ?? 1),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't make that booking." };
  }

  revalidatePath(`/${estateSlug}/amenities`);
  return { booked: true };
}

export async function cancelBookingAction(estateSlug: string, bookingId: string) {
  const { membership, resident } = await requireResident(estateSlug);
  await cancelBooking(membership.estateId, resident.id, bookingId);
  revalidatePath(`/${estateSlug}/amenities`);
}
