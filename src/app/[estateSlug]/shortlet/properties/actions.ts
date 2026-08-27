"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { createPropertySchema, addUnitSchema, updatePropertyStatusSchema } from "@/server/modules/shortlet/schema";
import { addUnit, createProperty, updatePropertyStatus, addPropertyImage } from "@/server/modules/shortlet/properties";

export interface CreatePropertyFormState {
  error?: string;
}

export async function createPropertyAction(
  estateSlug: string,
  _prevState: CreatePropertyFormState,
  formData: FormData,
): Promise<CreatePropertyFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "shortlet-properties:*");

  const amenities = String(formData.get("amenities") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const unitLabels = String(formData.get("unitLabels") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const photoUrls = formData.getAll("photoUrls").map(String).filter(Boolean);

  const parsed = createPropertySchema.safeParse({
    name: formData.get("name"),
    propertyType: formData.get("propertyType"),
    address: formData.get("address"),
    country: formData.get("country"),
    city: formData.get("city"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    maxGuests: formData.get("maxGuests"),
    amenities,
    description: formData.get("description") || undefined,
    houseRules: formData.get("houseRules") || undefined,
    checkInTime: formData.get("checkInTime"),
    checkOutTime: formData.get("checkOutTime"),
    baseNightlyRateMinor: formData.get("baseNightlyRateMinor"),
    cleaningFeeMinor: formData.get("cleaningFeeMinor") || undefined,
    securityDepositMinor: formData.get("securityDepositMinor") || undefined,
    minStayNights: formData.get("minStayNights") || undefined,
    maxStayNights: formData.get("maxStayNights") || undefined,
    unitLabels: unitLabels.length ? unitLabels : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the property details." };
  }

  let propertyId: string;
  try {
    const property = await createProperty(membership.estateId, user.id, parsed.data);
    propertyId = property.id;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't create that property." };
  }

  for (let i = 0; i < photoUrls.length; i++) {
    await addPropertyImage(membership.estateId, propertyId, photoUrls[i], i);
  }

  revalidatePath(`/${estateSlug}/shortlet/properties`);
  redirect(`/${estateSlug}/shortlet/properties/${propertyId}`);
}

export async function addUnitAction(estateSlug: string, propertyId: string, formData: FormData) {
  const { user, membership } = await requireEstatePermission(estateSlug, "shortlet-units:*");
  const parsed = addUnitSchema.safeParse({ unitLabel: formData.get("unitLabel") });
  if (!parsed.success) return;

  await addUnit(membership.estateId, user.id, propertyId, parsed.data.unitLabel);
  revalidatePath(`/${estateSlug}/shortlet/properties/${propertyId}`);
}

export async function updatePropertyStatusAction(estateSlug: string, propertyId: string, formData: FormData) {
  const { user, membership } = await requireEstatePermission(estateSlug, "shortlet-properties:*");
  const parsed = updatePropertyStatusSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) return;

  await updatePropertyStatus(membership.estateId, user.id, propertyId, parsed.data.status);
  revalidatePath(`/${estateSlug}/shortlet/properties/${propertyId}`);
  revalidatePath(`/${estateSlug}/shortlet/properties`);
}
