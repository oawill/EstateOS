"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { generateSimpleHousesSchema, generateStreetHousesSchema } from "@/server/modules/onboarding/schema";
import { bulkGenerateSimpleHouses, bulkGenerateStreetHouses } from "@/server/modules/onboarding/service";

export interface GenerateHousesFormState {
  error?: string;
  createdCount?: number;
}

export async function generateSimpleHousesAction(
  estateSlug: string,
  _prevState: GenerateHousesFormState,
  formData: FormData,
): Promise<GenerateHousesFormState> {
  const { membership, user } = await requireEstatePermission(estateSlug, "estate:*");

  const parsed = generateSimpleHousesSchema.safeParse({
    prefix: formData.get("prefix"),
    startNumber: formData.get("startNumber"),
    endNumber: formData.get("endNumber"),
    propertyType: formData.get("propertyType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the numbering range." };
  }

  const createdCount = await bulkGenerateSimpleHouses(membership.estateId, user.id, parsed.data);
  revalidatePath(`/onboarding/new-estate/${estateSlug}/structure`);
  return { createdCount };
}

export async function generateStreetHousesAction(
  estateSlug: string,
  _prevState: GenerateHousesFormState,
  formData: FormData,
): Promise<GenerateHousesFormState> {
  const { membership, user } = await requireEstatePermission(estateSlug, "estate:*");

  const parsed = generateStreetHousesSchema.safeParse({
    streetName: formData.get("streetName"),
    prefix: formData.get("prefix"),
    startNumber: formData.get("startNumber"),
    endNumber: formData.get("endNumber"),
    propertyType: formData.get("propertyType"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the street and numbering details." };
  }

  const createdCount = await bulkGenerateStreetHouses(membership.estateId, user.id, parsed.data);
  revalidatePath(`/onboarding/new-estate/${estateSlug}/structure`);
  return { createdCount };
}
