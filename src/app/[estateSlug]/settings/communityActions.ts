"use server";

import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { setClassifiedCategoryActive, updateCommunitySettings } from "@/server/modules/community/settings";

export interface CommunitySettingsFormState {
  error?: string;
}

export async function updateCommunitySettingsAction(
  estateSlug: string,
  _prevState: CommunitySettingsFormState,
  formData: FormData,
): Promise<CommunitySettingsFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "community-settings:*");

  await updateCommunitySettings(user.id, membership.estateId, {
    communityEnabled: formData.get("communityEnabled") === "on",
    classifiedsEnabled: formData.get("classifiedsEnabled") === "on",
    listingsRequireApproval: formData.get("listingsRequireApproval") === "on",
    guidelinesText: String(formData.get("guidelinesText") ?? "").trim(),
  });

  revalidatePath(`/${estateSlug}/settings`);
  return {};
}

export async function toggleCategoryAction(estateSlug: string, categoryId: string, isActive: boolean): Promise<void> {
  const { user, membership } = await requireEstatePermission(estateSlug, "community-settings:*");
  await setClassifiedCategoryActive(user.id, membership.estateId, categoryId, isActive);
  revalidatePath(`/${estateSlug}/settings`);
}
