"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEstatePermission } from "@/server/auth/guards";
import { createChargeSchema } from "@/server/modules/billing/schema";
import { approveManualPayment, createChargeAndGenerateInvoices, rejectManualPayment } from "@/server/modules/billing/service";

export interface CreateChargeFormState {
  error?: string;
}

function buildTargetCriteria(targetType: string, formData: FormData): Record<string, unknown> {
  switch (targetType) {
    case "BLOCK":
      return { blockIds: formData.getAll("blockIds") };
    case "STREET":
      return { streetIds: formData.getAll("streetIds") };
    case "PROPERTY_TYPE":
      return { propertyTypes: formData.getAll("propertyTypes") };
    case "SELECTED_PROPERTIES":
      return { propertyIds: formData.getAll("propertyIds") };
    default:
      return {};
  }
}

export async function createChargeAction(
  estateSlug: string,
  _prevState: CreateChargeFormState,
  formData: FormData,
): Promise<CreateChargeFormState> {
  const { user, membership } = await requireEstatePermission(estateSlug, "charges:*");

  const targetType = String(formData.get("targetType") ?? "");
  const amountNaira = Number(formData.get("amountNaira"));

  const parsed = createChargeSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    chargeType: formData.get("chargeType"),
    amountKobo: Number.isFinite(amountNaira) ? Math.round(amountNaira * 100) : NaN,
    dueDate: formData.get("dueDate"),
    targetType,
    targetCriteria: buildTargetCriteria(targetType, formData),
  });
  if (!parsed.success) {
    return { error: "Please check the charge details and target selection." };
  }

  await createChargeAndGenerateInvoices(membership.estateId, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/billing`);
  redirect(`/${estateSlug}/billing`);
}

export async function approveManualPaymentAction(estateSlug: string, paymentId: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "payments:*");
  await approveManualPayment(membership.estateId, user.id, paymentId);
  revalidatePath(`/${estateSlug}/billing`);
}

export async function rejectManualPaymentAction(estateSlug: string, paymentId: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "payments:*");
  await rejectManualPayment(membership.estateId, user.id, paymentId);
  revalidatePath(`/${estateSlug}/billing`);
}
