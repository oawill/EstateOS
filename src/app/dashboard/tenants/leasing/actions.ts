"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import {
  createListingSchema,
  scheduleViewingSchema,
  recordViewingOutcomeSchema,
  updateScreeningItemSchema,
  addApplicationNoteSchema,
  recordApplicationDecisionSchema,
  createOfferSchema,
  overrideReadinessItemSchema,
  updateApprovalPolicySchema,
} from "@/server/modules/tenantManagement/schema";
import { createListing, publishListing, withdrawListing, openApplications } from "@/server/modules/tenantManagement/listing";
import { assignInquiry, updateInquiryStatus } from "@/server/modules/tenantManagement/inquiry";
import { scheduleViewing, confirmViewing, cancelViewing, recordViewingOutcome } from "@/server/modules/tenantManagement/viewing";
import { assignApplication, updateApplicationStatus } from "@/server/modules/tenantManagement/application";
import { updateScreeningItem } from "@/server/modules/tenantManagement/screening";
import { addApplicationNote, recordApplicationDecision } from "@/server/modules/tenantManagement/decision";
import { createOffer, releaseReservationForOffer } from "@/server/modules/tenantManagement/offer";
import { generateLeaseFromOffer, sendLeaseForSignature, recordLeaseSigned } from "@/server/modules/tenantManagement/leasing";
import { setReadinessFlag, overrideReadinessItem } from "@/server/modules/tenantManagement/moveInReadiness";
import { startMoveIn } from "@/server/modules/tenantManagement/moveInOut";
import { convertApplicantToTenant } from "@/server/modules/tenantManagement/activation";
import { updateApprovalPolicy } from "@/server/modules/tenantManagement/property";
import type { ApplicationStatus, ScreeningCheckType, ScreeningItemStatus } from "@prisma/client";

export interface ActionState {
  error?: string;
}

function formError(error: unknown): ActionState {
  return { error: error instanceof Error ? error.message : "Something went wrong. Please try again." };
}

function toMinor(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === "") return undefined;
  const naira = Number(value);
  if (Number.isNaN(naira)) return undefined;
  return Math.round(naira * 100);
}

const LEASING_PATH = "/dashboard/tenants/leasing";

export async function createListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const amenities = String(formData.get("amenities") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = createListingSchema.safeParse({
    unitId: formData.get("unitId"),
    title: formData.get("title"),
    description: formData.get("description"),
    rentAmountMinor: toMinor(formData.get("rentAmountMinor")),
    rentFrequency: formData.get("rentFrequency"),
    serviceChargeMinor: toMinor(formData.get("serviceChargeMinor")) ?? 0,
    securityDepositMinor: toMinor(formData.get("securityDepositMinor")) ?? 0,
    bedrooms: formData.get("bedrooms") || undefined,
    bathrooms: formData.get("bathrooms") || undefined,
    furnishedStatus: formData.get("furnishedStatus") || "UNFURNISHED",
    availableDate: formData.get("availableDate"),
    amenities,
    displayArea: formData.get("displayArea") || undefined,
  });
  if (!parsed.success) return { error: "Please check the listing details." };

  try {
    await createListing(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(LEASING_PATH);
  return {};
}

export async function publishListingAction(listingId: string) {
  const user = await requireUser();
  await publishListing(user, listingId);
  revalidatePath(LEASING_PATH);
}

export async function withdrawListingAction(listingId: string) {
  const user = await requireUser();
  await withdrawListing(user, listingId);
  revalidatePath(LEASING_PATH);
}

export async function openApplicationsAction(listingId: string) {
  const user = await requireUser();
  await openApplications(user, listingId);
  revalidatePath(LEASING_PATH);
}

export async function assignInquiryAction(inquiryId: string) {
  const user = await requireUser();
  await assignInquiry(user, inquiryId, user.id);
  revalidatePath(LEASING_PATH);
}

export async function updateInquiryStatusAction(inquiryId: string, status: Parameters<typeof updateInquiryStatus>[2]) {
  const user = await requireUser();
  await updateInquiryStatus(user, inquiryId, status);
  revalidatePath(LEASING_PATH);
}

export async function scheduleViewingManagerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = scheduleViewingSchema.safeParse({
    listingId: formData.get("listingId"),
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    type: formData.get("type") || "PHYSICAL",
    preferredDate: formData.get("preferredDate"),
    preferredTime: formData.get("preferredTime") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the viewing details." };

  try {
    await scheduleViewing(parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(LEASING_PATH);
  return {};
}

export async function confirmViewingAction(viewingId: string) {
  const user = await requireUser();
  await confirmViewing(user, viewingId);
  revalidatePath(LEASING_PATH);
}

export async function cancelViewingAction(viewingId: string) {
  const user = await requireUser();
  await cancelViewing(user, viewingId);
  revalidatePath(LEASING_PATH);
}

export async function markViewingAttendedQuickAction(viewingId: string) {
  const user = await requireUser();
  await recordViewingOutcome(user, { viewingId, attended: true });
  revalidatePath(LEASING_PATH);
}

export async function recordViewingOutcomeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = recordViewingOutcomeSchema.safeParse({
    viewingId: formData.get("viewingId"),
    attended: formData.get("attended") === "on",
    interested: formData.get("interested") === "on",
    applicationInvited: formData.get("applicationInvited") === "on",
    outcomeNotes: formData.get("outcomeNotes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the viewing outcome details." };

  try {
    await recordViewingOutcome(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(LEASING_PATH);
  return {};
}

function detailPath(applicationId: string) {
  return `/dashboard/tenants/leasing/${applicationId}`;
}

export async function assignApplicationAction(applicationId: string) {
  const user = await requireUser();
  await assignApplication(user, applicationId, user.id);
  revalidatePath(detailPath(applicationId));
  revalidatePath(LEASING_PATH);
}

export async function updateApplicationStatusAction(applicationId: string, status: ApplicationStatus) {
  const user = await requireUser();
  await updateApplicationStatus(user, applicationId, status);
  revalidatePath(detailPath(applicationId));
  revalidatePath(LEASING_PATH);
}

export async function updateScreeningItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId"));
  const parsed = updateScreeningItemSchema.safeParse({
    applicationId,
    checkType: formData.get("checkType") as ScreeningCheckType,
    status: formData.get("status") as ScreeningItemStatus,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the screening update." };

  try {
    await updateScreeningItem(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(detailPath(applicationId));
  return {};
}

export async function addApplicationNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId"));
  const parsed = addApplicationNoteSchema.safeParse({ applicationId, body: formData.get("body") });
  if (!parsed.success) return { error: "A note cannot be empty." };

  try {
    await addApplicationNote(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(detailPath(applicationId));
  return {};
}

export async function recordApplicationDecisionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId"));
  const parsed = recordApplicationDecisionSchema.safeParse({
    applicationId,
    decision: formData.get("decision"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "A documented reason is required for every decision." };

  try {
    await recordApplicationDecision(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(detailPath(applicationId));
  revalidatePath(LEASING_PATH);
  return {};
}

export async function createOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId"));
  const parsed = createOfferSchema.safeParse({
    applicationId,
    rentAmountMinor: toMinor(formData.get("rentAmountMinor")),
    paymentFrequency: formData.get("paymentFrequency"),
    serviceChargeMinor: toMinor(formData.get("serviceChargeMinor")) ?? 0,
    securityDepositMinor: toMinor(formData.get("securityDepositMinor")) ?? 0,
    leaseDurationMonths: formData.get("leaseDurationMonths"),
    proposedStartDate: formData.get("proposedStartDate"),
    expiresAt: formData.get("expiresAt"),
    specialConditions: formData.get("specialConditions") || undefined,
  });
  if (!parsed.success) return { error: "Please check the offer details." };

  try {
    await createOffer(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(detailPath(applicationId));
  revalidatePath(LEASING_PATH);
  return {};
}

export async function releaseOfferReservationAction(offerId: string, applicationId: string) {
  const user = await requireUser();
  await releaseReservationForOffer(user, offerId);
  revalidatePath(detailPath(applicationId));
  revalidatePath(LEASING_PATH);
}

export async function generateLeaseFromOfferAction(offerId: string, applicationId: string) {
  const user = await requireUser();
  await generateLeaseFromOffer(user, offerId);
  revalidatePath(detailPath(applicationId));
  revalidatePath("/dashboard/tenants/leases");
}

export async function sendLeaseForSignatureAction(leaseId: string, applicationId: string) {
  const user = await requireUser();
  await sendLeaseForSignature(user, leaseId);
  revalidatePath(detailPath(applicationId));
}

export async function recordLeaseSignedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const leaseId = String(formData.get("leaseId"));
  const applicationId = String(formData.get("applicationId"));
  const documentUrl = String(formData.get("documentUrl") ?? "");
  if (!documentUrl) return { error: "Please provide the signed document's URL." };

  try {
    await recordLeaseSigned(user, leaseId, documentUrl);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(detailPath(applicationId));
  return {};
}

export async function startMoveInForApplicationAction(leaseId: string, applicationId: string) {
  const user = await requireUser();
  await startMoveIn(user, leaseId);
  revalidatePath(detailPath(applicationId));
  revalidatePath("/dashboard/tenants/move-in");
}

export async function setReadinessFlagAction(moveInId: string, field: string, value: boolean, applicationId: string) {
  const user = await requireUser();
  await setReadinessFlag(user, moveInId, field as never, value);
  revalidatePath(detailPath(applicationId));
}

export async function overrideReadinessItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId"));
  const parsed = overrideReadinessItemSchema.safeParse({
    moveInId: formData.get("moveInId"),
    item: formData.get("item"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "An override requires a reason." };

  try {
    await overrideReadinessItem(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(detailPath(applicationId));
  return {};
}

export async function convertApplicantToTenantAction(moveInId: string, applicationId: string) {
  const user = await requireUser();
  await convertApplicantToTenant(user, moveInId);
  revalidatePath(detailPath(applicationId));
  revalidatePath(LEASING_PATH);
  revalidatePath("/dashboard/tenants/tenants");
  revalidatePath("/dashboard/tenants/move-in");
}

export async function updateApprovalPolicyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateApprovalPolicySchema.safeParse({
    propertyId: formData.get("propertyId"),
    approvalPolicy: formData.get("approvalPolicy"),
  });
  if (!parsed.success) return { error: "Please select a valid approval policy." };

  try {
    await updateApprovalPolicy(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(LEASING_PATH);
  return {};
}
