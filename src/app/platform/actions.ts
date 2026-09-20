"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { assignPlanSchema } from "@/server/modules/platform/plansSchema";
import { assignPlan, setEstateSubscriptionStatus } from "@/server/modules/platform/service";
import { setShortletEnabled } from "@/server/modules/shortlet/settings";
import { linkEstateToOrganization } from "@/server/modules/organizations/service";

export async function toggleEstateStatusAction(estateId: string, status: "ACTIVE" | "SUSPENDED") {
  const user = await requirePlatformAdmin();
  await setEstateSubscriptionStatus(estateId, user.id, status);
  revalidatePath("/platform/estates");
  revalidatePath(`/platform/estates/${estateId}`);
}

export async function toggleShortletEnabledAction(estateId: string, enabled: boolean) {
  const user = await requirePlatformAdmin();
  await setShortletEnabled(estateId, user.id, enabled);
  revalidatePath(`/platform/estates/${estateId}`);
}

export interface AssignPlanFormState {
  error?: string;
}

export async function assignPlanAction(
  estateId: string,
  _prevState: AssignPlanFormState,
  formData: FormData,
): Promise<AssignPlanFormState> {
  const user = await requirePlatformAdmin();

  const parsed = assignPlanSchema.safeParse({
    estateId,
    planId: formData.get("planId") || undefined,
    trialEndsAt: formData.get("trialEndsAt") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the plan assignment." };
  }

  await assignPlan(user.id, estateId, parsed.data.planId ?? null, parsed.data.trialEndsAt ?? null);
  revalidatePath(`/platform/estates/${estateId}`);
  revalidatePath("/platform");
  return {};
}

export async function linkEstateOrganizationAction(estateId: string, formData: FormData) {
  const user = await requirePlatformAdmin();
  const organizationId = String(formData.get("organizationId") || "") || null;
  await linkEstateToOrganization(user.id, estateId, organizationId);
  revalidatePath(`/platform/estates/${estateId}`);
}
