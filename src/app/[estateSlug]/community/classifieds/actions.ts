"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ClassifiedListingStatus, type ClassifiedCondition, type ListingContactMethod } from "@prisma/client";
import { requireEstatePermission } from "@/server/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { getResidentByUserId } from "@/server/modules/residents/service";
import { createListing, createListingInquiry, toggleSavedListing, updateListingStatus } from "@/server/modules/community/classifieds";

export interface ListingFormState {
  error?: string;
}

async function requireResident(estateSlug: string) {
  const { user, membership } = await requireEstatePermission(estateSlug, "community-listings:*");
  const resident = await getResidentByUserId(membership.estateId, user.id);
  if (!resident) throw new NotFoundError("Resident profile");
  return { estateId: membership.estateId, residentId: resident.id };
}

export async function createListingAction(
  estateSlug: string,
  _prevState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const { estateId, residentId } = await requireResident(estateSlug);

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!title || !description || !categoryId) return { error: "Please fill in the required fields." };

  const priceRaw = formData.get("priceKobo");
  const priceNaira = priceRaw ? Number(priceRaw) : undefined;

  const contactMethods = formData.getAll("contactMethods").map(String) as ListingContactMethod[];
  const imageUrls = formData.getAll("imageUrls").map(String).filter(Boolean);
  const condition = (String(formData.get("condition") ?? "") || undefined) as ClassifiedCondition | undefined;
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");
  const availableFromRaw = String(formData.get("availableFrom") ?? "");
  const availableToRaw = String(formData.get("availableTo") ?? "");
  const nightlyRateRaw = formData.get("nightlyRateKobo");
  const nightlyRateNaira = nightlyRateRaw ? Number(nightlyRateRaw) : undefined;
  const bedroomsRaw = formData.get("bedrooms");
  const maxGuestsRaw = formData.get("maxGuests");
  const amenities = String(formData.get("amenities") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  let listingId: string;
  try {
    const listing = await createListing(estateId, residentId, {
      categoryId,
      title,
      description,
      priceKobo: priceNaira !== undefined && Number.isFinite(priceNaira) ? Math.round(priceNaira * 100) : undefined,
      negotiable: formData.get("negotiable") === "on",
      condition,
      locationNote: String(formData.get("locationNote") ?? "").trim() || undefined,
      contactMethods,
      whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim() || undefined,
      phoneNumber: String(formData.get("phoneNumber") ?? "").trim() || undefined,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : undefined,
      imageUrls,
      nightlyRateKobo: nightlyRateNaira !== undefined && Number.isFinite(nightlyRateNaira) ? Math.round(nightlyRateNaira * 100) : undefined,
      bedrooms: bedroomsRaw ? Number(bedroomsRaw) : undefined,
      maxGuests: maxGuestsRaw ? Number(maxGuestsRaw) : undefined,
      amenities,
      availableFrom: availableFromRaw ? new Date(availableFromRaw) : undefined,
      availableTo: availableToRaw ? new Date(availableToRaw) : undefined,
    });
    listingId = listing.id;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't create that listing." };
  }

  revalidatePath(`/${estateSlug}/community/classifieds`);
  redirect(`/${estateSlug}/community/classifieds/${listingId}`);
}

export async function updateListingStatusAction(estateSlug: string, listingId: string, status: ClassifiedListingStatus): Promise<void> {
  const { estateId, residentId } = await requireResident(estateSlug);
  await updateListingStatus(estateId, residentId, listingId, status);
  revalidatePath(`/${estateSlug}/community/classifieds/${listingId}`);
  revalidatePath(`/${estateSlug}/community/classifieds`);
}

export async function toggleSavedListingAction(estateSlug: string, listingId: string): Promise<void> {
  const { estateId, residentId } = await requireResident(estateSlug);
  await toggleSavedListing(estateId, residentId, listingId);
  revalidatePath(`/${estateSlug}/community/classifieds/${listingId}`);
  revalidatePath(`/${estateSlug}/community/saved`);
}

export interface InquiryFormState {
  error?: string;
  sent?: boolean;
}

export async function sendListingInquiryAction(
  estateSlug: string,
  listingId: string,
  _prevState: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const { estateId, residentId } = await requireResident(estateSlug);
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Write a message first." };

  await createListingInquiry(estateId, residentId, listingId, message);
  return { sent: true };
}
