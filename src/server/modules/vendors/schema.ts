import { MaintenanceCategory } from "@prisma/client";
import { z } from "zod";

export const vendorSchema = z.object({
  name: z.string().trim().min(1, "Vendor name is required").max(160),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  category: z.nativeEnum(MaintenanceCategory).optional(),
  isApproved: z.coerce.boolean().default(true),
  contractStartDate: z.coerce.date().optional(),
  contractEndDate: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type VendorInput = z.infer<typeof vendorSchema>;

// Kept as an alias so the facility module's transition form (which only
// ever needs name/contactName/phone/email/category) can keep using a
// narrower create call without pulling in the full vendor-management schema.
export const createVendorSchema = vendorSchema;
export type CreateVendorInput = VendorInput;
