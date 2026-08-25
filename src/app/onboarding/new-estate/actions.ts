"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { createEstateSchema } from "@/server/modules/estates/schema";
import { createEstate } from "@/server/modules/estates/service";

export interface CreateEstateFormState {
  error?: string;
}

export async function createEstateAction(
  _prevState: CreateEstateFormState,
  formData: FormData,
): Promise<CreateEstateFormState> {
  const user = await requireUser();

  const parsed = createEstateSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please enter at least an estate name." };
  }

  const estate = await createEstate(user.id, parsed.data);
  redirect(`/${estate.slug}/dashboard`);
}
