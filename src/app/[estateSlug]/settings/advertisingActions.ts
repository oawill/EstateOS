"use server";

import { revalidatePath } from "next/cache";
import { AdCategory } from "@prisma/client";
import { requireEstatePermission } from "@/server/auth/guards";
import { setEstateAdvertisingPolicy } from "@/server/modules/advertising/service";

export async function updateAdvertisingPolicyAction(estateSlug: string, formData: FormData) {
  const { user, membership } = await requireEstatePermission(estateSlug, "estate:*");

  const advertisingEnabled = formData.get("advertisingEnabled") === "on";
  const blockedCategories = formData
    .getAll("blockedCategories")
    .filter((v): v is string => typeof v === "string")
    .filter((v): v is AdCategory => Object.values(AdCategory).includes(v as AdCategory));

  await setEstateAdvertisingPolicy(user.id, membership.estateId, advertisingEnabled, blockedCategories);
  revalidatePath(`/${estateSlug}/settings`);
}
