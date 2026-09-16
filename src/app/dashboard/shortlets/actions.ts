"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/session";
import {
  createOperatorProfileSchema,
  assignOperatorSchema,
  createShortletListingSchema,
  createRatePlanSchema,
  createAvailabilityBlockSchema,
  createOwnerStaySchema,
  createBookingSchema,
  recordBookingPaymentSchema,
  cancelBookingSchema,
} from "@/server/modules/shortletManagement/schema";
import { createOrGetOwnOperatorProfile, assignShortletOperator } from "@/server/modules/shortletManagement/operator";
import { createShortletListing, updateListingStatus } from "@/server/modules/shortletManagement/listing";
import { createRatePlan, deleteRatePlan } from "@/server/modules/shortletManagement/ratePlan";
import { createAvailabilityBlock, removeAvailabilityBlock, createOwnerStay } from "@/server/modules/shortletManagement/availability";
import { createBooking, recordBookingPayment, checkInBooking, checkOutBooking, cancelBooking } from "@/server/modules/shortletManagement/booking";

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

const HUB_PATH = "/dashboard/shortlets";

export async function createOperatorProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createOperatorProfileSchema.safeParse({
    name: formData.get("name") || user.name,
    contactEmail: formData.get("contactEmail") || user.email || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
  });
  if (!parsed.success) return { error: "Please check the operator profile details." };

  try {
    await createOrGetOwnOperatorProfile(user.id, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(HUB_PATH);
  return {};
}

export async function assignOperatorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
  revalidatePath(HUB_PATH);
  return {};
}

export async function createShortletListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const amenities = String(formData.get("amenities") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = createShortletListingSchema.safeParse({
    unitId: formData.get("unitId"),
    title: formData.get("title"),
    description: formData.get("description"),
    bedrooms: formData.get("bedrooms") || undefined,
    bathrooms: formData.get("bathrooms") || undefined,
    maxGuests: formData.get("maxGuests"),
    amenities,
    checkInTime: formData.get("checkInTime"),
    checkOutTime: formData.get("checkOutTime"),
    baseNightlyRateMinor: toMinor(formData.get("baseNightlyRateMinor")),
    cleaningFeeMinor: toMinor(formData.get("cleaningFeeMinor")) ?? 0,
    securityDepositMinor: toMinor(formData.get("securityDepositMinor")) ?? 0,
    minStayNights: formData.get("minStayNights") || 1,
  });
  if (!parsed.success) return { error: "Please check the listing details." };

  try {
    await createShortletListing(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(HUB_PATH);
  revalidatePath("/dashboard/shortlets/listings");
  return {};
}

export async function updateListingStatusAction(listingId: string, status: Parameters<typeof updateListingStatus>[2]) {
  const user = await requireUser();
  await updateListingStatus(user, listingId, status);
  revalidatePath("/dashboard/shortlets/listings");
}

export async function createRatePlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const daysOfWeek = String(formData.get("daysOfWeek") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = createRatePlanSchema.safeParse({
    listingId: formData.get("listingId"),
    type: formData.get("type"),
    label: formData.get("label") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    daysOfWeek,
    nightlyRateMinor: toMinor(formData.get("nightlyRateMinor")),
    minStayNights: formData.get("minStayNights") || undefined,
  });
  if (!parsed.success) return { error: "Please check the rate plan details." };

  const listingId = String(formData.get("listingId"));
  try {
    await createRatePlan(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(`/dashboard/shortlets/listings/${listingId}`);
  return {};
}

export async function deleteRatePlanAction(ratePlanId: string, listingId: string) {
  const user = await requireUser();
  await deleteRatePlan(user, ratePlanId);
  revalidatePath(`/dashboard/shortlets/listings/${listingId}`);
}

export async function createAvailabilityBlockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const listingId = String(formData.get("listingId"));
  const parsed = createAvailabilityBlockSchema.safeParse({
    listingId,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the block details." };

  try {
    await createAvailabilityBlock(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(`/dashboard/shortlets/listings/${listingId}`);
  return {};
}

export async function removeAvailabilityBlockAction(blockId: string, listingId: string) {
  const user = await requireUser();
  await removeAvailabilityBlock(user, blockId);
  revalidatePath(`/dashboard/shortlets/listings/${listingId}`);
}

export async function createOwnerStayAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const listingId = String(formData.get("listingId"));
  const parsed = createOwnerStaySchema.safeParse({
    listingId,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the owner stay details." };

  try {
    await createOwnerStay(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(`/dashboard/shortlets/listings/${listingId}`);
  return {};
}

export async function createDirectBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = createBookingSchema.safeParse({
    listingId: formData.get("listingId"),
    guest: {
      fullName: formData.get("fullName"),
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      whatsapp: formData.get("whatsapp") || undefined,
      country: formData.get("country") || undefined,
    },
    checkInDate: formData.get("checkInDate"),
    checkOutDate: formData.get("checkOutDate"),
    numberOfGuests: formData.get("numberOfGuests"),
    bookingSource: formData.get("bookingSource") || "DIRECT",
    discountMinor: toMinor(formData.get("discountMinor")) ?? 0,
    additionalFeesMinor: toMinor(formData.get("additionalFeesMinor")) ?? 0,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the booking details." };

  try {
    await createBooking(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath("/dashboard/shortlets/bookings");
  revalidatePath(HUB_PATH);
  return {};
}

export async function recordBookingPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId"));
  const parsed = recordBookingPaymentSchema.safeParse({
    bookingId,
    amountMinor: toMinor(formData.get("amountMinor")),
    method: formData.get("method"),
    paidAt: formData.get("paidAt") || undefined,
    transactionRef: formData.get("transactionRef") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please check the payment details." };

  try {
    await recordBookingPayment(user, parsed.data);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(`/dashboard/shortlets/bookings/${bookingId}`);
  return {};
}

export async function checkInBookingAction(bookingId: string) {
  const user = await requireUser();
  await checkInBooking(user, bookingId);
  revalidatePath(`/dashboard/shortlets/bookings/${bookingId}`);
}

export async function checkOutBookingAction(bookingId: string) {
  const user = await requireUser();
  await checkOutBooking(user, bookingId);
  revalidatePath(`/dashboard/shortlets/bookings/${bookingId}`);
}

export async function cancelBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId"));
  const parsed = cancelBookingSchema.safeParse({ bookingId, reason: formData.get("reason") });
  if (!parsed.success) return { error: "A reason is required to cancel a booking." };

  try {
    await cancelBooking(user, bookingId, parsed.data.reason);
  } catch (error) {
    return formError(error);
  }
  revalidatePath(`/dashboard/shortlets/bookings/${bookingId}`);
  return {};
}
