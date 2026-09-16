import {
  RentFrequency,
  RentPaymentMethod,
  RentalMaintenanceCategory,
  RentalMaintenancePriority,
  RentalPropertyType,
  PropertyInspectionType,
  RentalChargeType,
  ManagementFeeType,
  FurnishedStatus,
  ViewingType,
  ScreeningCheckType,
  ScreeningItemStatus,
  ApplicationDecisionType,
  PropertyApprovalPolicy,
} from "@prisma/client";
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

export const createTenantChargeSchema = z.object({
  tenantId: z.string().cuid(),
  propertyId: z.string().cuid(),
  unitId: z.string().cuid().optional(),
  leaseId: z.string().cuid().optional(),
  type: z.nativeEnum(RentalChargeType),
  amountMinor: z.coerce.number().int().positive(),
  dueDate: z.coerce.date(),
  description: z.string().trim().min(1).max(1000),
});
export type CreateTenantChargeInput = z.infer<typeof createTenantChargeSchema>;

const allocationSchema = z.object({
  rentObligationId: z.string().cuid().optional(),
  chargeId: z.string().cuid().optional(),
  amountMinor: z.coerce.number().int().positive(),
});

export const recordPaymentSchema = z.object({
  tenantId: z.string().cuid(),
  leaseId: z.string().cuid(),
  amountMinor: z.coerce.number().int().positive(),
  method: z.nativeEnum(RentPaymentMethod),
  paidAt: z.coerce.date().optional(),
  transactionRef: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
  proofOfPaymentUrl: z.string().url().optional(),
  // Zero-length is valid — a payment can be recorded as pure account
  // credit with nothing allocated yet (e.g. paid before the next rent
  // period's obligation even exists); recordPayment() turns the
  // unallocated remainder into a credit row either way.
  allocations: z.array(allocationSchema),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const reversePaymentSchema = z.object({
  paymentId: z.string().cuid(),
  reason: z.string().trim().min(1).max(1000),
});
export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

export const waiveObligationSchema = z.object({
  obligationId: z.string().cuid(),
  reason: z.string().trim().min(1).max(1000),
});
export type WaiveObligationInput = z.infer<typeof waiveObligationSchema>;

export const upsertManagementAgreementSchema = z
  .object({
    propertyId: z.string().cuid(),
    feeType: z.nativeEnum(ManagementFeeType),
    feePercent: z.coerce.number().min(0).max(100).optional(),
    feeAmountMinor: z.coerce.number().int().min(0).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => (v.feeType === "PERCENTAGE" ? v.feePercent !== undefined : v.feeAmountMinor !== undefined), {
    message: "A percentage fee needs feePercent; a fixed fee needs feeAmountMinor",
  });
export type UpsertManagementAgreementInput = z.infer<typeof upsertManagementAgreementSchema>;

export const generateSettlementSchema = z.object({
  ownerId: z.string().cuid(),
  propertyId: z.string().cuid().optional(),
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2000).max(2100),
});
export type GenerateSettlementInput = z.infer<typeof generateSettlementSchema>;

export const updateSettlementStatusSchema = z.object({
  settlementId: z.string().cuid(),
  status: z.enum(["PENDING", "APPROVED", "PROCESSING", "PAID", "FAILED", "CANCELLED"]),
  paymentReference: z.string().trim().max(120).optional(),
});
export type UpdateSettlementStatusInput = z.infer<typeof updateSettlementStatusSchema>;

export const updateReminderSettingSchema = z.object({
  beforeDueDays: z.array(z.coerce.number().int().min(0).max(365)).max(10),
  afterDueDays: z.array(z.coerce.number().int().min(0).max(365)).max(10),
});
export type UpdateReminderSettingInput = z.infer<typeof updateReminderSettingSchema>;

export const updatePayoutDetailsSchema = z.object({
  payoutBankName: z.string().trim().min(1).max(160),
  payoutAccountNumber: z.string().trim().min(1).max(40),
  payoutAccountName: z.string().trim().min(1).max(160),
});
export type UpdatePayoutDetailsInput = z.infer<typeof updatePayoutDetailsSchema>;

// ---------------------------------------------------------------------------
// Phase 3 -- Tenant Acquisition & Leasing.
// ---------------------------------------------------------------------------

export const createListingSchema = z.object({
  unitId: z.string().cuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  rentAmountMinor: z.coerce.number().int().positive(),
  rentFrequency: z.nativeEnum(RentFrequency),
  serviceChargeMinor: z.coerce.number().int().min(0).default(0),
  securityDepositMinor: z.coerce.number().int().min(0).default(0),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  furnishedStatus: z.nativeEnum(FurnishedStatus).default(FurnishedStatus.UNFURNISHED),
  availableDate: z.coerce.date(),
  amenities: z.array(z.string().trim().max(60)).max(40).default([]),
  rules: z.string().trim().max(2000).optional(),
  imageUrls: z.array(z.string().url()).max(30).default([]),
  videoUrls: z.array(z.string().url()).max(10).default([]),
  displayArea: z.string().trim().max(120).optional(),
  viewingAvailabilityNotes: z.string().trim().max(1000).optional(),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const createInquirySchema = z.object({
  listingReference: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  preferredMoveInDate: z.coerce.date().optional(),
  message: z.string().trim().max(2000).optional(),
});
export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

export const scheduleViewingSchema = z.object({
  listingId: z.string().cuid(),
  applicantId: z.string().cuid().optional(),
  name: z.string().trim().min(1).max(160).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  type: z.nativeEnum(ViewingType).default(ViewingType.PHYSICAL),
  preferredDate: z.coerce.date(),
  preferredTime: z.string().trim().max(20).optional(),
  alternativeDate: z.coerce.date().optional(),
  alternativeTime: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type ScheduleViewingInput = z.infer<typeof scheduleViewingSchema>;

export const recordViewingOutcomeSchema = z.object({
  viewingId: z.string().cuid(),
  attended: z.coerce.boolean(),
  interested: z.coerce.boolean().optional(),
  applicationInvited: z.coerce.boolean().optional(),
  outcomeNotes: z.string().trim().max(2000).optional(),
});
export type RecordViewingOutcomeInput = z.infer<typeof recordViewingOutcomeSchema>;

export const startApplicationSchema = z.object({
  listingReference: z.string().trim().min(1).max(40),
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
});
export type StartApplicationInput = z.infer<typeof startApplicationSchema>;

export const saveApplicationSchema = z.object({
  applicationId: z.string().cuid(),
  fullName: z.string().trim().min(1).max(160).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  dateOfBirth: z.coerce.date().optional(),
  currentAddress: z.string().trim().max(400).optional(),
  employmentStatus: z.string().trim().max(80).optional(),
  employerName: z.string().trim().max(160).optional(),
  occupation: z.string().trim().max(120).optional(),
  incomeRange: z.string().trim().max(80).optional(),
  employmentDurationMonths: z.coerce.number().int().min(0).max(1200).optional(),
  preferredMoveInDate: z.coerce.date().optional(),
  occupantsCount: z.coerce.number().int().min(1).max(50).optional(),
  intendedLeaseDurationMonths: z.coerce.number().int().min(1).max(120).optional(),
  currentHousingStatus: z.string().trim().max(80).optional(),
  previousLandlordName: z.string().trim().max(160).optional(),
  previousLandlordContact: z.string().trim().max(160).optional(),
  emergencyContactName: z.string().trim().max(160).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
});
export type SaveApplicationInput = z.infer<typeof saveApplicationSchema>;

export const addApplicationDocumentSchema = z.object({
  applicationId: z.string().cuid(),
  label: z.string().trim().min(1).max(160),
  fileUrl: z.string().url(),
  documentType: z.string().trim().max(60).optional(),
});
export type AddApplicationDocumentInput = z.infer<typeof addApplicationDocumentSchema>;

export const updateScreeningItemSchema = z.object({
  applicationId: z.string().cuid(),
  checkType: z.nativeEnum(ScreeningCheckType),
  status: z.nativeEnum(ScreeningItemStatus),
  notes: z.string().trim().max(2000).optional(),
});
export type UpdateScreeningItemInput = z.infer<typeof updateScreeningItemSchema>;

export const addApplicationNoteSchema = z.object({
  applicationId: z.string().cuid(),
  body: z.string().trim().min(1).max(4000),
});
export type AddApplicationNoteInput = z.infer<typeof addApplicationNoteSchema>;

export const recordApplicationDecisionSchema = z.object({
  applicationId: z.string().cuid(),
  decision: z.nativeEnum(ApplicationDecisionType),
  reason: z.string().trim().min(1).max(2000),
});
export type RecordApplicationDecisionInput = z.infer<typeof recordApplicationDecisionSchema>;

export const createOfferSchema = z.object({
  applicationId: z.string().cuid(),
  rentAmountMinor: z.coerce.number().int().positive(),
  paymentFrequency: z.nativeEnum(RentFrequency),
  serviceChargeMinor: z.coerce.number().int().min(0).default(0),
  securityDepositMinor: z.coerce.number().int().min(0).default(0),
  leaseDurationMonths: z.coerce.number().int().min(1).max(120),
  proposedStartDate: z.coerce.date(),
  expiresAt: z.coerce.date(),
  specialConditions: z.string().trim().max(2000).optional(),
});
export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export const respondToOfferSchema = z.object({
  offerId: z.string().cuid(),
  accept: z.coerce.boolean(),
  declineReason: z.string().trim().max(1000).optional(),
});
export type RespondToOfferInput = z.infer<typeof respondToOfferSchema>;

export const overrideReadinessItemSchema = z.object({
  moveInId: z.string().cuid(),
  item: z.string().trim().min(1).max(60),
  reason: z.string().trim().min(1).max(1000),
});
export type OverrideReadinessItemInput = z.infer<typeof overrideReadinessItemSchema>;

export const updateApprovalPolicySchema = z.object({
  propertyId: z.string().cuid(),
  approvalPolicy: z.nativeEnum(PropertyApprovalPolicy),
});
export type UpdateApprovalPolicyInput = z.infer<typeof updateApprovalPolicySchema>;
