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

export async function nextRentReceiptNumber(): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, "tenant_management_rent_receipt");
  return formatSequenceCode("RCT", value);
}

export async function nextMaintenanceRequestCode(): Promise<string> {
  const value = await nextPlatformSequenceNumber(prisma, "tenant_management_maintenance_request");
  return formatSequenceCode("MREQ", value);
}
