"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { setEstateSubscriptionStatus } from "@/server/modules/platform/service";

export async function toggleEstateStatusAction(estateId: string, status: "ACTIVE" | "SUSPENDED") {
  const user = await requirePlatformAdmin();
  await setEstateSubscriptionStatus(estateId, user.id, status);
  revalidatePath("/platform");
}
