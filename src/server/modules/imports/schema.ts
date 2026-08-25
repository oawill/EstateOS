import { OccupancyRole, PropertyType } from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

export const propertyImportRowSchema = z.object({
  addressLabel: z.string().trim().min(1, "Address is required").max(160),
  propertyType: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase().replace(/\s+/g, "_") : v),
    z.nativeEnum(PropertyType, { message: `Property type must be one of: ${Object.values(PropertyType).join(", ")}` }),
  ),
  blockName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  streetName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  // Semicolon-separated, e.g. "1A;1B;2A" — blank means one implicit unit.
  unitLabels: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});
export type PropertyImportRow = z.infer<typeof propertyImportRowSchema>;

export const residentImportRowSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.preprocess(emptyToUndefined, z.string().trim().email("Invalid email").optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  propertyAddressLabel: z.string().trim().min(1, "Property address is required").max(160),
  unitLabel: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  occupancyRole: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase().replace(/\s+/g, "_") : v),
    z.nativeEnum(OccupancyRole, { message: `Role must be one of: ${Object.values(OccupancyRole).join(", ")}` }),
  ),
  moveInDate: z.coerce.date({ message: "Invalid move-in date" }),
  emergencyContactName: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  emergencyContactPhone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  vehiclePlateNumber: z.preprocess(emptyToUndefined, z.string().trim().max(20).optional()),
});
export type ResidentImportRow = z.infer<typeof residentImportRowSchema>;

export interface ValidatedRow<T> {
  rowNumber: number;
  data: T;
  errors: string[];
}
