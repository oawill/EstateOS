"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { initiatePaystackPayment, recordManualPayment } from "@/server/modules/billing/service";
import { PaystackNotConfiguredError } from "@/server/modules/billing/paystack";
import { recordManualPaymentSchema } from "@/server/modules/billing/schema";

async function requireOwnResident(estateSlug: string, permission: "own-payments:*") {
  const { user, membership } = await requireEstatePermission(estateSlug, permission);
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");
  return { user, membership, resident };
}

export interface PayWithPaystackFormState {
  error?: string;
}

export async function payWithPaystackAction(
  estateSlug: string,
  _prevState: PayWithPaystackFormState,
  formData: FormData,
): Promise<PayWithPaystackFormState> {
  const { membership, resident } = await requireOwnResident(estateSlug, "own-payments:*");
  const invoiceId = String(formData.get("invoiceId"));

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const callbackUrl = `${baseUrl}/${estateSlug}/billing/paystack/callback`;

  let authorizationUrl: string;
  try {
    authorizationUrl = await initiatePaystackPayment(
      membership.estateId,
      { id: resident.id, email: resident.email },
      invoiceId,
      callbackUrl,
    );
  } catch (error) {
    if (error instanceof PaystackNotConfiguredError) {
      return { error: "Online card/bank payment isn't set up yet — use 'I've paid by transfer' below instead." };
    }
    throw error;
  }

  redirect(authorizationUrl);
}

export interface RecordManualPaymentFormState {
  error?: string;
}

export async function recordManualPaymentAction(
  estateSlug: string,
  _prevState: RecordManualPaymentFormState,
  formData: FormData,
): Promise<RecordManualPaymentFormState> {
  const { user, membership, resident } = await requireOwnResident(estateSlug, "own-payments:*");

  const amountNaira = Number(formData.get("amountNaira"));
  const parsed = recordManualPaymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amountKobo: Number.isFinite(amountNaira) ? Math.round(amountNaira * 100) : NaN,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please enter a valid amount." };
  }

  await recordManualPayment(membership.estateId, resident.id, user.id, parsed.data);
  revalidatePath(`/${estateSlug}/my/bills`);
  return {};
}
