"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { createAmenity, setAmenityActive } from "@/server/modules/amenities/service";

export interface AmenityFormState {
  error?: string;
  saved?: boolean;
}

export async function createAmenityAction(estateSlug: string, _prev: AmenityFormState, formData: FormData): Promise<AmenityFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "estate:*");

  const name = String(formData.get("name") ?? "").trim();
  const openTime = String(formData.get("openTime") ?? "");
  const closeTime = String(formData.get("closeTime") ?? "");
  const slotMinutes = Number(formData.get("slotMinutes"));
  const maxSlots = Number(formData.get("maxSlots"));
  const capacity = Number(formData.get("capacity"));

  if (name.length < 2) return { error: "Give the facility a name." };
  if (!/^\d{2}:\d{2}$/.test(openTime) || !/^\d{2}:\d{2}$/.test(closeTime)) return { error: "Set opening and closing times." };
  if (![15, 30, 45, 60, 90, 120].includes(slotMinutes)) return { error: "Choose a slot length." };
  if (!Number.isInteger(maxSlots) || maxSlots < 1 || maxSlots > 8) return { error: "Max slots must be between 1 and 8." };
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) return { error: "Bookings per slot must be between 1 and 100." };

  try {
    await createAmenity(membership.estateId, user.id, {
      name,
      description: String(formData.get("description") ?? "").trim() || undefined,
      openTime,
      closeTime,
      slotMinutes,
      maxSlots,
      capacity,
      feeNote: String(formData.get("feeNote") ?? "").trim() || undefined,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't save that facility." };
  }

  revalidatePath(`/${estateSlug}/amenities/manage`);
  return { saved: true };
}

export async function toggleAmenityAction(estateSlug: string, amenityId: string, isActive: boolean) {
  const { user, membership } = await requireEstatePermission(estateSlug, "estate:*");
  await setAmenityActive(membership.estateId, user.id, amenityId, isActive);
  revalidatePath(`/${estateSlug}/amenities/manage`);
}
