import { prisma } from "@/server/db/client";
import { nextPlatformSequenceNumber } from "@/server/modules/demoRequests/sequence";

/** Public listing reference, e.g. "NQS-2026-000184". */
export async function nextShortletListingReference(year: number = new Date().getFullYear()): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, `shortlet_management_listing_${year}`);
  return `NQS-${year}-${String(value).padStart(6, "0")}`;
}

/** Booking reference, e.g. "NQB-2026-000184". */
export async function nextBookingReference(year: number = new Date().getFullYear()): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, `shortlet_management_booking_${year}`);
  return `NQB-${year}-${String(value).padStart(6, "0")}`;
}
