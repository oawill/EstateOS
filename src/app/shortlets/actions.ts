"use server";

import { createBookingSchema } from "@/server/modules/shortletManagement/schema";
import { createBooking } from "@/server/modules/shortletManagement/booking";
import { prisma } from "@/server/db/client";

export interface ActionState {
  error?: string;
  success?: boolean;
  bookingReference?: string;
}

function formError(error: unknown): ActionState {
  return { error: error instanceof Error ? error.message : "Something went wrong. Please try again." };
}

/** Public — a guest requests a stay from a listing page. Creates a PENDING booking; the operator confirms after payment (no gateway wired in this pass — see the completion notes). */
export async function requestBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const listingReference = String(formData.get("listingReference") ?? "");
  const listing = await prisma.shortletListing.findUnique({ where: { listingReference } });
  if (!listing) return { error: "Listing not found." };

  const parsed = createBookingSchema.safeParse({
    listingId: listing.id,
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
    bookingSource: "NIDRAQ",
  });
  if (!parsed.success) return { error: "Please check your dates and details." };

  try {
    const booking = await createBooking(null, parsed.data);
    return { success: true, bookingReference: booking.bookingReference };
  } catch (error) {
    return formError(error);
  }
}
