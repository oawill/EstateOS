import { prisma } from "@/server/db/client";
import { formatSequenceCode } from "@/server/modules/sequence";
import { nextPlatformSequenceNumber } from "@/server/modules/demoRequests/sequence";

export async function nextLeaseCode(): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, "tenant_management_lease");
  return formatSequenceCode("LEASE", value);
}

export async function nextRentPaymentReference(): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, "tenant_management_rent_payment");
  return formatSequenceCode("PMT", value);
}

/** Human-readable, year-scoped receipt numbers — e.g. "NQR-2026-000184". The counter resets each calendar year (a fresh sequence key per year), matching the format's own implication that the year is part of what makes a receipt number unique-looking, not just a decoration. */
export async function nextRentReceiptNumber(year: number = new Date().getFullYear()): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, `tenant_management_rent_receipt_${year}`);
  return `NQR-${year}-${String(value).padStart(6, "0")}`;
}

export async function nextMaintenanceRequestCode(): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, "tenant_management_maintenance_request");
  return formatSequenceCode("MREQ", value);
}

/** Public listing reference, e.g. "NQL-2026-000184" — safe to expose on the public marketplace, unlike the internal RentalListing.id. */
export async function nextListingReference(year: number = new Date().getFullYear()): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, `tenant_management_listing_${year}`);
  return `NQL-${year}-${String(value).padStart(6, "0")}`;
}

/** Application reference, e.g. "NQA-2026-000184" — shown to the applicant for save/resume and support lookups. */
export async function nextApplicationReference(year: number = new Date().getFullYear()): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, `tenant_management_application_${year}`);
  return `NQA-${year}-${String(value).padStart(6, "0")}`;
}

/** Offer reference, e.g. "NQO-2026-000184". */
export async function nextOfferReference(year: number = new Date().getFullYear()): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, `tenant_management_offer_${year}`);
  return `NQO-${year}-${String(value).padStart(6, "0")}`;
}
