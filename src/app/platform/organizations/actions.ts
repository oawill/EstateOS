"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrganizationStatus, SubscriptionStatus } from "@prisma/client";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { createOrganizationSchema, createSubscriptionSchema } from "@/server/modules/organizations/schema";
import {
  addSubscription,
  createOrganization,
  updateOrganizationStatus,
  updateSubscriptionStatus,
} from "@/server/modules/organizations/service";

export interface OrganizationFormState {
  error?: string;
}

export async function createOrganizationAction(
  _prevState: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const user = await requirePlatformAdmin();

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    organizationType: formData.get("organizationType"),
    primaryContactName: formData.get("primaryContactName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    country: formData.get("country") || undefined,
    billingNotes: formData.get("billingNotes") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please enter an organization name and type." };
  }

  const organization = await createOrganization(user.id, parsed.data);
  redirect(`/platform/organizations/${organization.id}`);
}

export async function updateOrganizationStatusAction(organizationId: string, formData: FormData) {
  const user = await requirePlatformAdmin();
  const raw = String(formData.get("status") ?? "");
  if (!Object.values(OrganizationStatus).includes(raw as OrganizationStatus)) return;

  await updateOrganizationStatus(user.id, organizationId, raw as OrganizationStatus);
  revalidatePath(`/platform/organizations/${organizationId}`);
  revalidatePath("/platform/organizations");
}

export interface AddSubscriptionFormState {
  error?: string;
}

export async function addSubscriptionAction(
  organizationId: string,
  _prevState: AddSubscriptionFormState,
  formData: FormData,
): Promise<AddSubscriptionFormState> {
  const user = await requirePlatformAdmin();

  const parsed = createSubscriptionSchema.safeParse({
    module: formData.get("module"),
    planId: formData.get("planId") || undefined,
    status: formData.get("status") || "TRIAL",
    quantity: formData.get("quantity") || undefined,
    monthlyPriceKobo: formData.get("monthlyPriceNaira")
      ? Math.round(Number(formData.get("monthlyPriceNaira")) * 100)
      : undefined,
    trialEndsAt: formData.get("trialEndsAt") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please choose a module and check the subscription details." };
  }

  await addSubscription(user.id, organizationId, parsed.data);
  revalidatePath(`/platform/organizations/${organizationId}`);
  return {};
}

export async function updateSubscriptionStatusAction(organizationId: string, subscriptionId: string, formData: FormData) {
  const user = await requirePlatformAdmin();
  const raw = String(formData.get("status") ?? "");
  if (!Object.values(SubscriptionStatus).includes(raw as SubscriptionStatus)) return;

  await updateSubscriptionStatus(user.id, subscriptionId, raw as SubscriptionStatus);
  revalidatePath(`/platform/organizations/${organizationId}`);
}
