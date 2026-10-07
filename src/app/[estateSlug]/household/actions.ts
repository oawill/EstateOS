"use server";

import { revalidatePath } from "next/cache";
import { HouseholdRelationship } from "@prisma/client";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { addHouseholdMember, removeHouseholdMember } from "@/server/modules/household/service";

export interface HouseholdFormState {
  error?: string;
  saved?: boolean;
}

export async function addHouseholdMemberAction(estateSlug: string, _prev: HouseholdFormState, formData: FormData): Promise<HouseholdFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "own-household:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  try {
    await addHouseholdMember(membership.estateId, user.id, resident.id, {
      fullName: String(formData.get("fullName") ?? ""),
      relationship: String(formData.get("relationship") ?? "") as HouseholdRelationship,
      phone: String(formData.get("phone") ?? ""),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't add that person." };
  }

  revalidatePath(`/${estateSlug}/household`);
  return { saved: true };
}

export async function removeHouseholdMemberAction(estateSlug: string, memberId: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "own-household:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");

  await removeHouseholdMember(membership.estateId, user.id, resident.id, memberId);
  revalidatePath(`/${estateSlug}/household`);
}
