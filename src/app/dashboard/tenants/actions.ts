"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import {
  createPropertyOwnerSchema,
  createManagedPropertySchema,
  createRentalUnitSchema,
  createTenantSchema,
  createLeaseSchema,
  renewLeaseSchema,
  recordRentPaymentSchema,
  recordMaintenanceExpenseSchema,
  assignPropertyManagerSchema,
  createPropertyInspectionSchema,
} from "@/server/modules/tenantManagement/schema";
import { createOrGetOwnProfile, createManagedProperty, createRentalUnit, assignPropertyManager } from "@/server/modules/tenantManagement/property";
import { createTenant } from "@/server/modules/tenantManagement/tenant";
import { createLease, renewLease, markLeaseNoticeGiven } from "@/server/modules/tenantManagement/lease";
import { recordRentPayment } from "@/server/modules/tenantManagement/payments";
import { updateMaintenanceStatus, recordMaintenanceExpense } from "@/server/modules/tenantManagement/maintenance";
import { startMoveIn, advanceMoveInStage, startMoveOut, advanceMoveOutStage } from "@/server/modules/tenantManagement/moveInOut";
import { createPropertyInspection } from "@/server/modules/tenantManagement/inspection";
import type { RentalMaintenanceStatus, MoveInStage, MoveOutStage } from "@prisma/client";

export interface ActionState {
  error?: string;
}

function formError(error: unknown): ActionState {
  return { error: error instanceof Error ? error.message : "Something went wrong. Please try again." };
}

/** Every money form field is entered in Naira (whole units) and converted here to minor units (kobo) — the only place in the UI layer that does this conversion, so every *Minor field downstream stays a plain integer. */
function toMinor(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === "") return undefined;
  const naira = Number(value);
  if (Number.isNaN(naira)) return undefined;
  return Math.round(naira * 100);
}

export async function createOwnerProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createPropertyOwnerSchema.safeParse({
    name: formData.get("name") || user.name,
    email: formData.get("email") || user.email || undefined,
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    countryOfResidence: formData.get("countryOfResidence") || undefined,
    preferredCurrency: formData.get("preferredCurrency") || "NGN",
    preferredCommunicationMethod: formData.get("preferredCommunicationMethod") || undefined,
  });
  if (!parsed.success) return { error: "Please check the landlord profile details." };

  try {
    await createOrGetOwnProfile(user.id, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants");
  return {};
}

export async function createPropertyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createManagedPropertySchema.safeParse({
    ownerId: formData.get("ownerId"),
    name: formData.get("name"),
    addressLine: formData.get("addressLine"),
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    country: formData.get("country") || "NG",
    propertyType: formData.get("propertyType"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the property details." };

  try {
    await createManagedProperty(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/properties");
  return {};
}

export async function createUnitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createRentalUnitSchema.safeParse({
    propertyId: formData.get("propertyId"),
    label: formData.get("label"),
    bedrooms: formData.get("bedrooms") || undefined,
    bathrooms: formData.get("bathrooms") || undefined,
    unitType: formData.get("unitType") || undefined,
    rentAmountMinor: toMinor(formData.get("rentAmountMinor")),
    rentFrequency: formData.get("rentFrequency") || "ANNUAL",
    serviceChargeMinor: toMinor(formData.get("serviceChargeMinor")) ?? 0,
    securityDepositMinor: toMinor(formData.get("securityDepositMinor")) ?? 0,
  });
  if (!parsed.success) return { error: "Please check the unit details." };

  try {
    await createRentalUnit(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/properties");
  return {};
}

export async function createTenantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createTenantSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the tenant details." };

  try {
    await createTenant(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/tenants");
  return {};
}

export async function createLeaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createLeaseSchema.safeParse({
    tenantId: formData.get("tenantId"),
    unitId: formData.get("unitId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    rentAmountMinor: toMinor(formData.get("rentAmountMinor")),
    paymentFrequency: formData.get("paymentFrequency"),
    securityDepositMinor: toMinor(formData.get("securityDepositMinor")) ?? 0,
    serviceChargeMinor: toMinor(formData.get("serviceChargeMinor")) ?? 0,
    rentDueDay: formData.get("rentDueDay") || 1,
    gracePeriodDays: formData.get("gracePeriodDays") || 0,
    renewalTerms: formData.get("renewalTerms") || undefined,
  });
  if (!parsed.success) return { error: "Please check the lease details." };

  try {
    await createLease(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/tenants");
  revalidatePath("/dashboard/tenants/leases");
  return {};
}

export async function renewLeaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = renewLeaseSchema.safeParse({
    previousLeaseId: formData.get("previousLeaseId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    rentAmountMinor: toMinor(formData.get("rentAmountMinor")),
    paymentFrequency: formData.get("paymentFrequency"),
    securityDepositMinor: toMinor(formData.get("securityDepositMinor")) ?? 0,
    serviceChargeMinor: toMinor(formData.get("serviceChargeMinor")) ?? 0,
    rentDueDay: formData.get("rentDueDay") || 1,
    gracePeriodDays: formData.get("gracePeriodDays") || 0,
    renewalTerms: formData.get("renewalTerms") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the renewal details." };

  try {
    await renewLease(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/leases");
  return {};
}

export async function markLeaseNoticeAction(leaseId: string) {
  const user = await requireUser();
  await markLeaseNoticeGiven(user, leaseId);
  revalidatePath("/dashboard/tenants/leases");
}

export async function recordRentPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = recordRentPaymentSchema.safeParse({
    obligationId: formData.get("obligationId"),
    amountMinor: toMinor(formData.get("amountMinor")),
    method: formData.get("method"),
    paidAt: formData.get("paidAt") || undefined,
    transactionRef: formData.get("transactionRef") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the payment details." };

  try {
    await recordRentPayment(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/payments");
  revalidatePath("/dashboard/tenants");
  return {};
}

export async function updateMaintenanceStatusAction(requestId: string, status: RentalMaintenanceStatus, vendorName?: string) {
  const user = await requireUser();
  await updateMaintenanceStatus(user, requestId, status, vendorName);
  revalidatePath("/dashboard/tenants/maintenance");
}

export async function recordMaintenanceExpenseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = recordMaintenanceExpenseSchema.safeParse({
    requestId: formData.get("requestId"),
    vendorName: formData.get("vendorName"),
    description: formData.get("description"),
    estimateMinor: toMinor(formData.get("estimateMinor")),
    approvedAmountMinor: toMinor(formData.get("approvedAmountMinor")),
    finalAmountMinor: toMinor(formData.get("finalAmountMinor")),
    isPaid: formData.get("isPaid") === "on",
  });
  if (!parsed.success) return { error: "Please check the expense details." };

  try {
    await recordMaintenanceExpense(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/maintenance");
  return {};
}

export async function startMoveInAction(leaseId: string) {
  const user = await requireUser();
  await startMoveIn(user, leaseId);
  revalidatePath("/dashboard/tenants/move-in");
}

export async function advanceMoveInStageAction(moveInId: string, stage: MoveInStage) {
  const user = await requireUser();
  await advanceMoveInStage(user, moveInId, stage);
  revalidatePath("/dashboard/tenants/move-in");
}

export async function startMoveOutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const leaseId = formData.get("leaseId");
  const noticeDate = formData.get("noticeDate");
  if (typeof leaseId !== "string" || !leaseId || typeof noticeDate !== "string" || !noticeDate) {
    return { error: "Please select a lease and a notice date." };
  }

  try {
    await startMoveOut(user, leaseId, new Date(noticeDate));
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/move-out");
  return {};
}

export async function advanceMoveOutStageAction(
  moveOutId: string,
  stage: Exclude<MoveOutStage, "NOTICE_RECEIVED">,
  extras?: { moveOutDate?: Date; finalBalanceMinor?: number; depositReturnedMinor?: number },
) {
  const user = await requireUser();
  await advanceMoveOutStage(user, moveOutId, stage, extras);
  revalidatePath("/dashboard/tenants/move-out");
}

export async function recordPropertyInspectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const photoUrls = (formData.get("photoUrls") as string | null ?? "")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);

  const parsed = createPropertyInspectionSchema.safeParse({
    propertyId: formData.get("propertyId"),
    unitId: formData.get("unitId") || undefined,
    type: formData.get("type"),
    inspectedAt: formData.get("inspectedAt") || undefined,
    notes: formData.get("notes") || undefined,
    issuesFound: formData.get("issuesFound") || undefined,
    photoUrls,
  });
  if (!parsed.success) return { error: "Please check the inspection details — photo entries must each be a valid URL." };

  try {
    await createPropertyInspection(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/inspections");
  return {};
}

export async function assignPropertyManagerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = assignPropertyManagerSchema.safeParse({
    propertyId: formData.get("propertyId"),
    userEmail: formData.get("userEmail"),
  });
  if (!parsed.success) return { error: "Please enter a valid email address." };

  try {
    await assignPropertyManager(user, parsed.data.propertyId, parsed.data.userEmail);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/properties");
  return {};
}
