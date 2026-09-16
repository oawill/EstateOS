"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import { requireTenantSelf } from "@/server/modules/tenantManagement/access";
import { createMaintenanceRequestSchema } from "@/server/modules/tenantManagement/schema";
import { createMaintenanceRequestAsTenant } from "@/server/modules/tenantManagement/maintenance";
import { initializeTenantRentPayment, isPaystackConfigured, PaystackNotConfiguredError } from "@/server/modules/tenantManagement/paystack";

export interface ActionState {
  error?: string;
}

export interface PayRentActionState {
  error?: string;
  authorizationUrl?: string;
}

/** Starts a Paystack checkout for one obligation — the payment ledger is only ever updated by the signature-verified webhook, never by this action or the browser redirect that follows it. */
export async function startRentPaymentAction(_prev: PayRentActionState, formData: FormData): Promise<PayRentActionState> {
  const { user, tenantId } = await requireTenantSelf(await requireUser());

  if (!isPaystackConfigured()) {
    return { error: "Online rent payment isn't set up yet — please contact your property manager to pay by bank transfer or cash." };
  }

  const obligationId = formData.get("obligationId");
  const amountMinor = Number(formData.get("amountMinor"));
  if (typeof obligationId !== "string" || !obligationId || !Number.isFinite(amountMinor) || amountMinor <= 0) {
    return { error: "Please enter a valid amount." };
  }
  if (!user.email) {
    return { error: "Add an email address to your account before paying online." };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const { authorizationUrl } = await initializeTenantRentPayment({
      tenantId,
      obligationId,
      amountMinor,
      email: user.email,
      callbackUrl: `${origin}/tenant/pay/callback`,
    });
    return { authorizationUrl };
  } catch (error) {
    if (error instanceof PaystackNotConfiguredError) return { error: error.message };
    return { error: error instanceof Error ? error.message : "Couldn't start the payment. Please try again." };
  }
}

export async function submitMaintenanceRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { tenantId } = await requireTenantSelf(await requireUser());

  const parsed = createMaintenanceRequestSchema.safeParse({
    propertyId: formData.get("propertyId"),
    unitId: formData.get("unitId"),
    category: formData.get("category"),
    description: formData.get("description"),
    priority: formData.get("priority") || "MEDIUM",
    permissionToEnter: formData.get("permissionToEnter") === "on",
    preferredContactMethod: formData.get("preferredContactMethod") || undefined,
    photoUrls: [],
  });
  if (!parsed.success) return { error: "Please check the request details." };

  try {
    await createMaintenanceRequestAsTenant(tenantId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't submit the request. Please try again." };
  }

  revalidatePath("/tenant");
  revalidatePath("/tenant/maintenance");
  return {};
}
