import { RentFrequency, RentPaymentMethod, RentalMaintenanceCategory, RentalMaintenancePriority, RentalPropertyType, PropertyInspectionType } from "@prisma/client";
import { z } from "zod";

export const createPropertyOwnerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  countryOfResidence: z.string().trim().max(80).optional(),
  preferredCurrency: z.string().trim().max(10).default("NGN"),
  preferredCommunicationMethod: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreatePropertyOwnerInput = z.infer<typeof createPropertyOwnerSchema>;

export const createManagedPropertySchema = z.object({
  ownerId: z.string().cuid(),
  name: z.string().trim().min(1).max(160),
  addressLine: z.string().trim().min(1).max(240),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).default("NG"),
  propertyType: z.nativeEnum(RentalPropertyType),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateManagedPropertyInput = z.infer<typeof createManagedPropertySchema>;

export const createRentalUnitSchema = z.object({
  propertyId: z.string().cuid(),
  label: z.string().trim().min(1).max(80),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  unitType: z.string().trim().max(60).optional(),
  rentAmountMinor: z.coerce.number().int().positive(),
  rentFrequency: z.nativeEnum(RentFrequency).default(RentFrequency.ANNUAL),
  serviceChargeMinor: z.coerce.number().int().min(0).default(0),
  securityDepositMinor: z.coerce.number().int().min(0).default(0),
});
export type CreateRentalUnitInput = z.infer<typeof createRentalUnitSchema>;

export const createTenantSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export const createLeaseSchema = z.object({
  tenantId: z.string().cuid(),
  unitId: z.string().cuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  rentAmountMinor: z.coerce.number().int().positive(),
  paymentFrequency: z.nativeEnum(RentFrequency),
  securityDepositMinor: z.coerce.number().int().min(0).default(0),
  serviceChargeMinor: z.coerce.number().int().min(0).default(0),
  rentDueDay: z.coerce.number().int().min(1).max(28).default(1),
  gracePeriodDays: z.coerce.number().int().min(0).max(90).default(0),
  renewalTerms: z.string().trim().max(2000).optional(),
});
export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;

export const renewLeaseSchema = z.object({
  previousLeaseId: z.string().cuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  rentAmountMinor: z.coerce.number().int().positive(),
  paymentFrequency: z.nativeEnum(RentFrequency),
  securityDepositMinor: z.coerce.number().int().min(0).default(0),
  serviceChargeMinor: z.coerce.number().int().min(0).default(0),
  rentDueDay: z.coerce.number().int().min(1).max(28).default(1),
  gracePeriodDays: z.coerce.number().int().min(0).max(90).default(0),
  renewalTerms: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type RenewLeaseInput = z.infer<typeof renewLeaseSchema>;

export const recordRentPaymentSchema = z.object({
  obligationId: z.string().cuid(),
  amountMinor: z.coerce.number().int().positive(),
  method: z.nativeEnum(RentPaymentMethod),
  paidAt: z.coerce.date().optional(),
  transactionRef: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type RecordRentPaymentInput = z.infer<typeof recordRentPaymentSchema>;

export const createMaintenanceRequestSchema = z.object({
  propertyId: z.string().cuid(),
  unitId: z.string().cuid(),
  category: z.nativeEnum(RentalMaintenanceCategory),
  description: z.string().trim().min(1).max(4000),
  priority: z.nativeEnum(RentalMaintenancePriority).default(RentalMaintenancePriority.MEDIUM),
  permissionToEnter: z.coerce.boolean().default(false),
  preferredContactMethod: z.string().trim().max(40).optional(),
  photoUrls: z.array(z.string().url()).max(10).default([]),
});
export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;

export const recordMaintenanceExpenseSchema = z.object({
  requestId: z.string().cuid(),
  vendorName: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2000),
  estimateMinor: z.coerce.number().int().min(0).optional(),
  approvedAmountMinor: z.coerce.number().int().min(0).optional(),
  finalAmountMinor: z.coerce.number().int().min(0).optional(),
  isPaid: z.coerce.boolean().default(false),
});
export type RecordMaintenanceExpenseInput = z.infer<typeof recordMaintenanceExpenseSchema>;

export const assignPropertyManagerSchema = z.object({
  propertyId: z.string().cuid(),
  userEmail: z.string().trim().email(),
});
export type AssignPropertyManagerInput = z.infer<typeof assignPropertyManagerSchema>;

export const createPropertyInspectionSchema = z.object({
  propertyId: z.string().cuid(),
  unitId: z.string().cuid().optional(),
  type: z.nativeEnum(PropertyInspectionType),
  inspectedAt: z.coerce.date().optional(),
  notes: z.string().trim().max(4000).optional(),
  issuesFound: z.string().trim().max(4000).optional(),
  photoUrls: z.array(z.string().url()).max(20).default([]),
});
export type CreatePropertyInspectionInput = z.infer<typeof createPropertyInspectionSchema>;
