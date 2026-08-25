"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { createPropertySchema } from "@/server/modules/properties/schema";
import { createProperty } from "@/server/modules/properties/service";

export interface CreatePropertyFormState {
  error?: string;
}

export async function createPropertyAction(
  estateSlug: string,
  _prevState: CreatePropertyFormState,
  formData: FormData,
): Promise<CreatePropertyFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "properties:*");

  const unitLabels = String(formData.get("unitLabels") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = createPropertySchema.safeParse({
    addressLabel: formData.get("addressLabel"),
    propertyType: formData.get("propertyType"),
    blockId: formData.get("blockId") || undefined,
    streetId: formData.get("streetId") || undefined,
    zoneId: formData.get("zoneId") || undefined,
    unitLabels: unitLabels.length ? unitLabels : undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the property details." };
  }

  await createProperty(membership.estateId, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/properties`);
  redirect(`/${estateSlug}/properties`);
}
