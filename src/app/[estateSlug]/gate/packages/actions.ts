"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { logParcel, markParcelCollected } from "@/server/modules/parcels/service";

export interface LogParcelState {
  error?: string;
  saved?: boolean;
}

export async function logParcelAction(estateSlug: string, _prev: LogParcelState, formData: FormData): Promise<LogParcelState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "gate:*");

  const residentId = String(formData.get("residentId") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (!residentId) return { error: "Choose the resident this parcel is for." };
  if (description.length < 2) return { error: "Describe the parcel (e.g. brown box, large)." };

  try {
    await logParcel(membership.estateId, user.id, {
      residentId,
      description,
      carrier: String(formData.get("carrier") ?? "").trim() || undefined,
    });
  } catch {
    return { error: "Couldn't log that parcel — check the resident and try again." };
  }

  revalidatePath(`/${estateSlug}/gate/packages`);
  return { saved: true };
}

export async function markCollectedAction(estateSlug: string, parcelId: string, formData: FormData) {
  const { user, membership } = await requireEstatePermission(estateSlug, "gate:*");
  await markParcelCollected(membership.estateId, user.id, parcelId, String(formData.get("collectedByName") ?? "").trim() || undefined);
  revalidatePath(`/${estateSlug}/gate/packages`);
}
