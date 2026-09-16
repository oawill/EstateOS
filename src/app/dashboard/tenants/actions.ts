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
  recordMaintenanceExpenseSchema,
  assignPropertyManagerSchema,
  createPropertyInspectionSchema,
  createTenantChargeSchema,
  recordPaymentSchema,
  reversePaymentSchema,
  waiveObligationSchema,
  upsertManagementAgreementSchema,
  generateSettlementSchema,
  updateSettlementStatusSchema,
  updateReminderSettingSchema,
  updatePayoutDetailsSchema,
} from "@/server/modules/tenantManagement/schema";
import { createOrGetOwnProfile, createManagedProperty, createRentalUnit, assignPropertyManager, updatePayoutDetails } from "@/server/modules/tenantManagement/property";
import { createTenant } from "@/server/modules/tenantManagement/tenant";
import { createLease, renewLease, markLeaseNoticeGiven } from "@/server/modules/tenantManagement/lease";
import { recordPayment, reversePayment, waiveObligation } from "@/server/modules/tenantManagement/payments";
import { updateMaintenanceStatus, recordMaintenanceExpense } from "@/server/modules/tenantManagement/maintenance";
import { startMoveIn, advanceMoveInStage, startMoveOut, advanceMoveOutStage } from "@/server/modules/tenantManagement/moveInOut";
import { createPropertyInspection } from "@/server/modules/tenantManagement/inspection";
import { createTenantCharge } from "@/server/modules/tenantManagement/charges";
import { upsertManagementAgreement, generateLandlordSettlement, updateSettlementStatus } from "@/server/modules/tenantManagement/managementFee";
import { updateReminderSetting, runReminderSweep } from "@/server/modules/tenantManagement/reminders";
import { assignOperatorSchema } from "@/server/modules/shortletManagement/schema";
import { assignShortletOperator } from "@/server/modules/shortletManagement/operator";
import type { RentalMaintenanceStatus, MoveInStage, MoveOutStage } from "@prisma/client";

export interface ActionState {
  error?: string;
}

function formError(error: unknown): ActionState {
  return { error: error instanceof Error ? error.message : "Something went wrong. Please try again." };
}

/** Every money form field is entered in Naira (whole units) and converted here to minor units (kobo) — the only place in the UI layer that does this conversion, so every *Minor field downstream stays a plain integer. */
function toMinor(value: FormDataEntryValue | number | null): number | undefined {
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

export async function createChargeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createTenantChargeSchema.safeParse({
    tenantId: formData.get("tenantId"),
    propertyId: formData.get("propertyId"),
    unitId: formData.get("unitId") || undefined,
    leaseId: formData.get("leaseId") || undefined,
    type: formData.get("type"),
    amountMinor: toMinor(formData.get("amountMinor")),
    dueDate: formData.get("dueDate"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: "Please check the charge details." };

  try {
    await createTenantCharge(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/charges");
  return {};
}

/** Records a payment that may cover more than one obligation/charge in one submission — the dashboard's "Record a payment" form. */
export async function recordPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  // The allocations JSON carries Naira amounts, same as every other money
  // field in this file — toMinor() below is the one place that converts,
  // per line, so a form never has to do minor-unit arithmetic itself.
  let rawAllocations: { rentObligationId?: string; chargeId?: string; amountMinor: number }[] = [];
  try {
    rawAllocations = JSON.parse(String(formData.get("allocations") ?? "[]"));
  } catch {
    return { error: "Invalid allocation data." };
  }
  const allocations = rawAllocations
    .map((a) => ({ ...a, amountMinor: toMinor(a.amountMinor) ?? 0 }))
    .filter((a) => a.amountMinor > 0);

  const parsed = recordPaymentSchema.safeParse({
    tenantId: formData.get("tenantId"),
    leaseId: formData.get("leaseId"),
    amountMinor: toMinor(formData.get("amountMinor")),
    method: formData.get("method"),
    paidAt: formData.get("paidAt") || undefined,
    transactionRef: formData.get("transactionRef") || undefined,
    notes: formData.get("notes") || undefined,
    proofOfPaymentUrl: formData.get("proofOfPaymentUrl") || undefined,
    allocations,
  });
  if (!parsed.success) return { error: "Please check the payment details." };

  try {
    await recordPayment(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/payments");
  revalidatePath("/dashboard/tenants/charges");
  revalidatePath("/dashboard/tenants");
  return {};
}

export async function reversePaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reversePaymentSchema.safeParse({
    paymentId: formData.get("paymentId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "A reason is required to reverse a payment." };

  try {
    await reversePayment(user, parsed.data.paymentId, parsed.data.reason);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/payments");
  revalidatePath("/dashboard/tenants");
  return {};
}

export async function waiveObligationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = waiveObligationSchema.safeParse({
    obligationId: formData.get("obligationId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "A reason is required to waive an obligation." };

  try {
    await waiveObligation(user, parsed.data.obligationId, parsed.data.reason);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/payments");
  return {};
}

export async function upsertManagementAgreementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const feePercentRaw = formData.get("feePercent");
  const feeAmountRaw = formData.get("feeAmountMinor");

  const parsed = upsertManagementAgreementSchema.safeParse({
    propertyId: formData.get("propertyId"),
    feeType: formData.get("feeType"),
    feePercent: feePercentRaw ? Number(feePercentRaw) : undefined,
    feeAmountMinor: feeAmountRaw ? toMinor(feeAmountRaw) : undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the management fee details." };

  try {
    await upsertManagementAgreement(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/settlements");
  return {};
}

export async function generateSettlementAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = generateSettlementSchema.safeParse({
    ownerId: formData.get("ownerId"),
    propertyId: formData.get("propertyId") || undefined,
    periodMonth: formData.get("periodMonth"),
    periodYear: formData.get("periodYear"),
  });
  if (!parsed.success) return { error: "Please select a valid period." };

  try {
    await generateLandlordSettlement(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/settlements");
  return {};
}

export async function updateSettlementStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateSettlementStatusSchema.safeParse({
    settlementId: formData.get("settlementId"),
    status: formData.get("status"),
    paymentReference: formData.get("paymentReference") || undefined,
  });
  if (!parsed.success) return { error: "Please check the settlement status update." };

  try {
    await updateSettlementStatus(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/settlements");
  return {};
}

export async function updateReminderSettingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateReminderSettingSchema.safeParse({
    beforeDueDays: String(formData.get("beforeDueDays") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    afterDueDays: String(formData.get("afterDueDays") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  });
  if (!parsed.success) return { error: "Please enter day counts as a comma-separated list, e.g. 30,14,7." };

  try {
    await updateReminderSetting(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/reminders");
  return {};
}

export async function runReminderSweepAction() {
  await requireUser();
  return runReminderSweep();
}

export async function updatePayoutDetailsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const ownerId = formData.get("ownerId");
  if (typeof ownerId !== "string" || !ownerId) return { error: "Missing landlord profile." };

  const parsed = updatePayoutDetailsSchema.safeParse({
    payoutBankName: formData.get("payoutBankName"),
    payoutAccountNumber: formData.get("payoutAccountNumber"),
    payoutAccountName: formData.get("payoutAccountName"),
  });
  if (!parsed.success) return { error: "Please check the bank details." };

  try {
    await updatePayoutDetails(user, ownerId, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/landlord");
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

/** Grants a Shortlet Management operator (a separate module — see src/server/modules/shortletManagement) access to run shortlet operations on this property. Only the property's own owner can grant it. */
export async function assignShortletOperatorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = assignOperatorSchema.safeParse({
    propertyId: formData.get("propertyId"),
    operatorEmail: formData.get("operatorEmail"),
  });
  if (!parsed.success) return { error: "Please enter a valid email address." };

  try {
    await assignShortletOperator(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/tenants/properties");
  return {};
}
