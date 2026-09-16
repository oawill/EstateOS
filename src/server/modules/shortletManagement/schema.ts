import { RentPaymentMethod, ShortletBookingSource, ShortletListingStatus, RatePlanType, ShortletAvailabilityBlockReason } from "@prisma/client";
import { z } from "zod";

export const createOperatorProfileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateOperatorProfileInput = z.infer<typeof createOperatorProfileSchema>;

export const assignOperatorSchema = z.object({
  propertyId: z.string().cuid(),
  operatorEmail: z.string().trim().email(),
});
export type AssignOperatorInput = z.infer<typeof assignOperatorSchema>;

export const createShortletListingSchema = z.object({
  unitId: z.string().cuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  maxGuests: z.coerce.number().int().min(1).max(100),
  amenities: z.array(z.string().trim().max(60)).max(40).default([]),
  imageUrls: z.array(z.string().url()).max(30).default([]),
  houseRules: z.string().trim().max(2000).optional(),
  checkInTime: z.string().trim().min(1).max(20),
  checkOutTime: z.string().trim().min(1).max(20),
  baseNightlyRateMinor: z.coerce.number().int().positive(),
  cleaningFeeMinor: z.coerce.number().int().min(0).default(0),
  securityDepositMinor: z.coerce.number().int().min(0).default(0),
  minStayNights: z.coerce.number().int().min(1).default(1),
  maxStayNights: z.coerce.number().int().min(1).optional(),
});
export type CreateShortletListingInput = z.infer<typeof createShortletListingSchema>;

export const updateListingStatusSchema = z.object({
  listingId: z.string().cuid(),
  status: z.nativeEnum(ShortletListingStatus),
});
export type UpdateListingStatusInput = z.infer<typeof updateListingStatusSchema>;

export const createRatePlanSchema = z.object({
  listingId: z.string().cuid(),
  type: z.nativeEnum(RatePlanType),
  label: z.string().trim().max(120).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).max(7).default([]),
  nightlyRateMinor: z.coerce.number().int().positive(),
  minStayNights: z.coerce.number().int().min(1).optional(),
});
export type CreateRatePlanInput = z.infer<typeof createRatePlanSchema>;

export const createAvailabilityBlockSchema = z.object({
  listingId: z.string().cuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.nativeEnum(ShortletAvailabilityBlockReason),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateAvailabilityBlockInput = z.infer<typeof createAvailabilityBlockSchema>;

export const createOwnerStaySchema = z.object({
  listingId: z.string().cuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateOwnerStayInput = z.infer<typeof createOwnerStaySchema>;

const guestInfoSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  country: z.string().trim().max(80).optional(),
});

export const createBookingSchema = z.object({
  listingId: z.string().cuid(),
  guest: guestInfoSchema,
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  numberOfGuests: z.coerce.number().int().min(1).max(100),
  bookingSource: z.nativeEnum(ShortletBookingSource).default(ShortletBookingSource.DIRECT),
  discountMinor: z.coerce.number().int().min(0).default(0),
  additionalFeesMinor: z.coerce.number().int().min(0).default(0),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const recordBookingPaymentSchema = z.object({
  bookingId: z.string().cuid(),
  amountMinor: z.coerce.number().int().positive(),
  method: z.nativeEnum(RentPaymentMethod),
  paidAt: z.coerce.date().optional(),
  transactionRef: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type RecordBookingPaymentInput = z.infer<typeof recordBookingPaymentSchema>;

export const cancelBookingSchema = z.object({
  bookingId: z.string().cuid(),
  reason: z.string().trim().min(1).max(1000),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
