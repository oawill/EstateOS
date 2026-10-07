"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { createShiftHandover } from "@/server/modules/security/handover";

export interface HandoverFormState {
  error?: string;
  saved?: boolean;
}

export async function createHandoverAction(estateSlug: string, _prev: HandoverFormState, formData: FormData): Promise<HandoverFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "gate:*");
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length < 5) return { error: "Add a few words for the next shift." };

  await createShiftHandover(membership.estateId, user.id, { gate: String(formData.get("gate") ?? "").trim() || undefined, notes });
  revalidatePath(`/${estateSlug}/gate/handover`);
  return { saved: true };
}
