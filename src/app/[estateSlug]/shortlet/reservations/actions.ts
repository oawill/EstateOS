"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ReservationStatus } from "@prisma/client";
import { requireEstatePermission } from "@/server/auth/guards";
import { createReservationSchema } from "@/server/modules/shortlet/schema";
import { createReservation, updateReservationStatus } from "@/server/modules/shortlet/reservations";

export interface ReservationFormState {
  error?: string;
}

export async function createReservationAction(
  estateSlug: string,
  _prevState: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "shortlet-reservations:*");

  const parsed = createReservationSchema.safeParse({
    unitId: formData.get("unitId"),
    guestId: formData.get("guestId"),
    checkInDate: formData.get("checkInDate"),
    checkOutDate: formData.get("checkOutDate"),
    numberOfGuests: formData.get("numberOfGuests"),
    nightlyRateMinor: formData.get("nightlyRateMinor"),
    taxesMinor: formData.get("taxesMinor") || undefined,
    cleaningFeeMinor: formData.get("cleaningFeeMinor") || undefined,
    securityDepositMinor: formData.get("securityDepositMinor") || undefined,
    discountMinor: formData.get("discountMinor") || undefined,
    additionalFeesMinor: formData.get("additionalFeesMinor") || undefined,
    bookingSource: formData.get("bookingSource"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the reservation details." };
  }

  let reservationId: string;
  try {
    const reservation = await createReservation(membership.estateId, user.id, parsed.data);
    reservationId = reservation.id;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't create that reservation." };
  }

  revalidatePath(`/${estateSlug}/shortlet/reservations`);
  redirect(`/${estateSlug}/shortlet/reservations/${reservationId}`);
}

export async function updateReservationStatusAction(estateSlug: string, reservationId: string, formData: FormData) {
  const { user, membership } = await requireEstatePermission(estateSlug, "shortlet-reservations:*");
  const status = formData.get("status");
  if (typeof status !== "string" || !(status in ReservationStatus)) return;

  await updateReservationStatus(membership.estateId, user.id, reservationId, status as ReservationStatus);
  revalidatePath(`/${estateSlug}/shortlet/reservations/${reservationId}`);
  revalidatePath(`/${estateSlug}/shortlet/reservations`);
  revalidatePath(`/${estateSlug}/shortlet`);
}
