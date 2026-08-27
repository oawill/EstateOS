"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { createGuestSchema } from "@/server/modules/shortlet/schema";
import { createGuest, updateGuest } from "@/server/modules/shortlet/guests";

export interface GuestFormState {
  error?: string;
}

function parseGuestFormData(formData: FormData) {
  return createGuestSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    country: formData.get("country") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    vehicleDetails: formData.get("vehicleDetails") || undefined,
    idType: formData.get("idType") || undefined,
    idNumber: formData.get("idNumber") || undefined,
    notes: formData.get("notes") || undefined,
    preferences: formData.get("preferences") || undefined,
  });
}

export async function createGuestAction(
  estateSlug: string,
  _prevState: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "shortlet-guests:*");
  const parsed = parseGuestFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the guest details." };
  }

  const guest = await createGuest(membership.estateId, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/shortlet/guests`);
  redirect(`/${estateSlug}/shortlet/guests/${guest.id}`);
}

export async function updateGuestAction(
  estateSlug: string,
  guestId: string,
  _prevState: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "shortlet-guests:*");
  const parsed = parseGuestFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the guest details." };
  }

  await updateGuest(membership.estateId, user.id, guestId, parsed.data);
  revalidatePath(`/${estateSlug}/shortlet/guests/${guestId}`);
  return {};
}
