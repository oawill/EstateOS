"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { createEstateWithOnboardingSchema } from "@/server/modules/onboarding/schema";
import { createEstateWithOnboarding } from "@/server/modules/onboarding/service";

export interface CreateEstateFormState {
  error?: string;
}

export async function createEstateAction(
  _prevState: CreateEstateFormState,
  formData: FormData,
): Promise<CreateEstateFormState> {
  const user = await requireUser();

  const parsed = createEstateWithOnboardingSchema.safeParse({
    name: formData.get("name"),
    estateType: formData.get("estateType"),
    managementModel: formData.get("managementModel"),
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    country: formData.get("country") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please enter an estate name and choose an estate type and management model." };
  }

  const estate = await createEstateWithOnboarding(user.id, parsed.data);
  redirect(`/onboarding/new-estate/${estate.slug}/structure`);
}
