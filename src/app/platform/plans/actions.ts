"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { createPlanSchema } from "@/server/modules/platform/plansSchema";
import { createPlan, setPlanActive } from "@/server/modules/platform/plans";

export interface CreatePlanFormState {
  error?: string;
}

export async function createPlanAction(
  _prevState: CreatePlanFormState,
  formData: FormData,
): Promise<CreatePlanFormState> {
  const user = await requirePlatformAdmin();

  const monthlyPriceNaira = Number(formData.get("monthlyPriceNaira"));
  const annualPriceNairaRaw = formData.get("annualPriceNaira");
  const annualPriceNaira = annualPriceNairaRaw ? Number(annualPriceNairaRaw) : undefined;

  const parsed = createPlanSchema.safeParse({
    name: formData.get("name"),
    monthlyPriceKobo: Number.isFinite(monthlyPriceNaira) ? Math.round(monthlyPriceNaira * 100) : NaN,
    annualPriceKobo:
      annualPriceNaira !== undefined && Number.isFinite(annualPriceNaira)
        ? Math.round(annualPriceNaira * 100)
        : undefined,
    unitLimit: formData.get("unitLimit") || undefined,
    featureSummary: formData.get("featureSummary") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please check the plan details." };
  }

  await createPlan(user.id, parsed.data);
  revalidatePath("/platform/plans");
  redirect("/platform/plans");
}

export async function setPlanActiveAction(planId: string, isActive: boolean) {
  const user = await requirePlatformAdmin();
  await setPlanActive(user.id, planId, isActive);
  revalidatePath("/platform/plans");
}
