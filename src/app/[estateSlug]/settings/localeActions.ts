"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { updateEstateLocale } from "@/server/modules/estates/service";

export interface LocaleSettingsFormState {
  error?: string;
}

export async function updateEstateLocaleAction(
  estateSlug: string,
  _prevState: LocaleSettingsFormState,
  formData: FormData,
): Promise<LocaleSettingsFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "estate:*");

  await updateEstateLocale(membership.estateId, user.id, {
    country: String(formData.get("country") ?? "NG"),
    currency: String(formData.get("currency") ?? "NGN"),
    timezone: String(formData.get("timezone") ?? "Africa/Lagos"),
    locale: String(formData.get("locale") ?? "en-NG"),
    phoneCountryCode: String(formData.get("phoneCountryCode") ?? "+234"),
  });

  revalidatePath(`/${estateSlug}/settings`);
  return {};
}
