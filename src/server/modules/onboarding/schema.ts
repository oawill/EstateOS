import { PropertyType } from "@prisma/client";
import { z } from "zod";

// Free-text-backed classification, not a DB enum — these only steer copy
// and defaults in the wizard, never core authorization (see AGENTS.md
// note on the onboarding spec: "Do not change core authorization merely
// based on this answer").
export const ESTATE_TYPES = [
  "GATED_ESTATE",
  "APARTMENT_COMPLEX",
  "RESIDENTIAL_DEVELOPMENT",
  "MIXED_RESIDENTIAL_COMMUNITY",
  "HOA_RESIDENTS_ASSOCIATION",
  "OTHER",
] as const;
export type EstateTypeOption = (typeof ESTATE_TYPES)[number];

export const ESTATE_TYPE_LABELS: Record<EstateTypeOption, string> = {
  GATED_ESTATE: "Gated Estate",
  APARTMENT_COMPLEX: "Apartment Complex",
  RESIDENTIAL_DEVELOPMENT: "Residential Development",
  MIXED_RESIDENTIAL_COMMUNITY: "Mixed Residential Community",
  HOA_RESIDENTS_ASSOCIATION: "HOA / Residents Association",
  OTHER: "Other",
};

export const MANAGEMENT_MODELS = [
  "ESTATE_MANAGEMENT_COMPANY",
  "RESIDENTS_ASSOCIATION",
  "HOA_ASSOCIATION",
  "PROPERTY_DEVELOPER",
  "ESTATE_OWNER",
  "SELF_MANAGED_COMMUNITY",
  "OTHER",
] as const;
export type ManagementModelOption = (typeof MANAGEMENT_MODELS)[number];

export const MANAGEMENT_MODEL_LABELS: Record<ManagementModelOption, string> = {
  ESTATE_MANAGEMENT_COMPANY: "Estate Management Company",
  RESIDENTS_ASSOCIATION: "Residents Association",
  HOA_ASSOCIATION: "HOA / Association",
  PROPERTY_DEVELOPER: "Property Developer",
  ESTATE_OWNER: "Estate Owner",
  SELF_MANAGED_COMMUNITY: "Self-Managed Community",
  OTHER: "Other",
};

export const createEstateWithOnboardingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  estateType: z.enum(ESTATE_TYPES),
  managementModel: z.enum(MANAGEMENT_MODELS),
  address: z.string().trim().max(240).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional(),
});
export type CreateEstateWithOnboardingInput = z.infer<typeof createEstateWithOnboardingSchema>;

export const generateSimpleHousesSchema = z
  .object({
    prefix: z.string().trim().min(1).max(40),
    startNumber: z.coerce.number().int().min(1),
    endNumber: z.coerce.number().int().min(1),
    propertyType: z.nativeEnum(PropertyType),
  })
  .refine((v) => v.endNumber >= v.startNumber, { message: "Ending number must be at or after the starting number" })
  .refine((v) => v.endNumber - v.startNumber < 2000, { message: "Generate at most 2,000 properties at a time" });
export type GenerateSimpleHousesInput = z.infer<typeof generateSimpleHousesSchema>;

export const generateStreetHousesSchema = z
  .object({
    streetName: z.string().trim().min(1).max(120),
    prefix: z.string().trim().min(1).max(40),
    startNumber: z.coerce.number().int().min(1),
    endNumber: z.coerce.number().int().min(1),
    propertyType: z.nativeEnum(PropertyType),
  })
  .refine((v) => v.endNumber >= v.startNumber, { message: "Ending number must be at or after the starting number" });
export type GenerateStreetHousesInput = z.infer<typeof generateStreetHousesSchema>;
