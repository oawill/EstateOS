"use server";

import { revalidatePath } from "next/cache";
import {
  createInquirySchema,
  scheduleViewingSchema,
  startApplicationSchema,
  saveApplicationSchema,
  addApplicationDocumentSchema,
} from "@/server/modules/tenantManagement/schema";
import { createInquiry } from "@/server/modules/tenantManagement/inquiry";
import { scheduleViewing } from "@/server/modules/tenantManagement/viewing";
import { startApplication, saveApplicationDraft, submitApplication, addApplicationDocument } from "@/server/modules/tenantManagement/application";
import { prisma } from "@/server/db/client";

export interface ActionState {
  error?: string;
  success?: boolean;
}

function formError(error: unknown): ActionState {
  return { error: error instanceof Error ? error.message : "Something went wrong. Please try again." };
}

/** Public — no authentication, called from a listing's "Ask a Question" form. */
export async function submitInquiryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createInquirySchema.safeParse({
    listingReference: formData.get("listingReference"),
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    preferredMoveInDate: formData.get("preferredMoveInDate") || undefined,
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) return { error: "Please fill in your name and at least one contact method." };

  try {
    await createInquiry(parsed.data);
  } catch (error) {
    return formError(error);
  }
  return { success: true };
}

/** Public — "Schedule Viewing" CTA on a listing page. */
export async function requestViewingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const listingReference = String(formData.get("listingReference") ?? "");
  const listing = await prisma.rentalListing.findUnique({ where: { listingReference } });
  if (!listing) return { error: "Listing not found." };

  const parsed = scheduleViewingSchema.safeParse({
    listingId: listing.id,
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    type: formData.get("type") || "PHYSICAL",
    preferredDate: formData.get("preferredDate"),
    preferredTime: formData.get("preferredTime") || undefined,
    alternativeDate: formData.get("alternativeDate") || undefined,
    alternativeTime: formData.get("alternativeTime") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the viewing request details." };

  try {
    await scheduleViewing(parsed.data);
  } catch (error) {
    return formError(error);
  }
  return { success: true };
}

/** Public — begins a save-resumable application; redirects the caller to /apply/[reference]/[applicationId]. */
export async function startApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState & { applicationId?: string }> {
  const parsed = startApplicationSchema.safeParse({
    listingReference: formData.get("listingReference"),
    fullName: formData.get("fullName"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: "Please enter your name and at least one contact method." };

  try {
    const application = await startApplication(parsed.data);
    return { success: true, applicationId: application.id };
  } catch (error) {
    return formError(error);
  }
}

export async function saveApplicationDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const parsed = saveApplicationSchema.safeParse({
    applicationId,
    fullName: formData.get("fullName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    currentAddress: formData.get("currentAddress") || undefined,
    employmentStatus: formData.get("employmentStatus") || undefined,
    employerName: formData.get("employerName") || undefined,
    occupation: formData.get("occupation") || undefined,
    incomeRange: formData.get("incomeRange") || undefined,
    employmentDurationMonths: formData.get("employmentDurationMonths") || undefined,
    preferredMoveInDate: formData.get("preferredMoveInDate") || undefined,
    occupantsCount: formData.get("occupantsCount") || undefined,
    intendedLeaseDurationMonths: formData.get("intendedLeaseDurationMonths") || undefined,
    currentHousingStatus: formData.get("currentHousingStatus") || undefined,
    previousLandlordName: formData.get("previousLandlordName") || undefined,
    previousLandlordContact: formData.get("previousLandlordContact") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
  });
  if (!parsed.success) return { error: "Please check the application details." };

  try {
    await saveApplicationDraft(parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(`/apply/status/${applicationId}`);
  return { success: true };
}

export async function addApplicationDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const parsed = addApplicationDocumentSchema.safeParse({
    applicationId,
    label: formData.get("label"),
    fileUrl: formData.get("fileUrl"),
    documentType: formData.get("documentType") || undefined,
  });
  if (!parsed.success) return { error: "Please provide a document label and a valid file URL." };

  try {
    await addApplicationDocument(parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(`/apply/status/${applicationId}`);
  return { success: true };
}

export async function submitApplicationAction(applicationId: string): Promise<ActionState> {
  try {
    await submitApplication(applicationId);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(`/apply/status/${applicationId}`);
  return { success: true };
}
