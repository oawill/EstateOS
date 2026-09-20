"use server";

import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { createChargeSchema } from "@/server/modules/billing/schema";
import { createChargeAndGenerateInvoices } from "@/server/modules/billing/service";
import { markFinancialsStepSkipped } from "@/server/modules/onboarding/service";

export interface CreateFirstChargeFormState {
  error?: string;
}

export async function createFirstChargeAction(
  estateSlug: string,
  _prevState: CreateFirstChargeFormState,
  formData: FormData,
): Promise<CreateFirstChargeFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "estate:*");

  const amountNaira = Number(formData.get("amountNaira"));
  const parsed = createChargeSchema.safeParse({
    title: formData.get("title"),
    chargeType: formData.get("chargeType"),
    amountKobo: Number.isFinite(amountNaira) ? Math.round(amountNaira * 100) : NaN,
    dueDate: formData.get("dueDate"),
    targetType: "ENTIRE_ESTATE",
    targetCriteria: {},
  });
  if (!parsed.success) {
    return { error: "Please enter a charge title, amount and due date." };
  }

  await createChargeAndGenerateInvoices(membership.estateId, user.id, parsed.data);
  redirect(`/onboarding/new-estate/${estateSlug}/review`);
}

export async function skipFinancialsAction(estateSlug: string) {
  const { membership } = await requireEstatePermission(estateSlug, "estate:*");
  await markFinancialsStepSkipped(membership.estateId);
  redirect(`/onboarding/new-estate/${estateSlug}/review`);
}
